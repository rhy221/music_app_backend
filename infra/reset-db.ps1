#Requires -Version 5.1
<#
.SYNOPSIS
    Clear data from all databases or a specific one.

.PARAMETER Target
    Which database to clear. Defaults to "all".
    Values: all | postgres | user_db | catalog_db | playlist_db |
            streaming_db | upload_db | mongodb | neo4j | redis |
            elasticsearch | minio

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    .\reset-db.ps1
    .\reset-db.ps1 -Target catalog_db -Force
    .\reset-db.ps1 -Target redis -Force
#>
param(
    [string]$Target = "all",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step ($msg) { Write-Host "  $msg" -ForegroundColor Cyan    }
function Write-Ok   ($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green  }
function Write-Skip ($msg) { Write-Host "  [--] $msg" -ForegroundColor Yellow }
function Write-Fail ($msg) { Write-Host "  [!!] $msg" -ForegroundColor Red    }

function Test-Container ([string]$Name) {
    $state = docker inspect --format "{{.State.Running}}" $Name 2>$null
    return ($LASTEXITCODE -eq 0 -and $state -eq "true")
}

# ─── PostgreSQL ───────────────────────────────────────────────────────────────
function Reset-Postgres ([string]$DbName) {
    $container = "music-postgres"
    if (-not (Test-Container $container)) {
        Write-Skip "$container not running — skipped $DbName"
        return
    }
    Write-Step "Truncating tables in $DbName ..."

    # Single-quoted here-string so $$ is literal (not PowerShell variable)
    $sql = @'
DO $body$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename
    FROM   pg_tables
    WHERE  schemaname NOT IN ('pg_catalog','information_schema')
      AND  tablename  != 'flyway_schema_history'
    ORDER  BY tablename
  ) LOOP
    EXECUTE 'TRUNCATE TABLE '
      || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename)
      || ' RESTART IDENTITY CASCADE';
  END LOOP;
END $body$;
'@

    $env:PGPASSWORD = "music_pass"
    $out = docker exec -e PGPASSWORD=music_pass $container `
        psql -U music_admin -d $DbName -c $sql 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Fail "$DbName — $out" } else { Write-Ok "$DbName cleared" }
}

# ─── MongoDB ─────────────────────────────────────────────────────────────────
function Reset-MongoDB {
    $container = "music-mongodb"
    if (-not (Test-Container $container)) {
        Write-Skip "$container not running — skipped MongoDB"
        return
    }
    Write-Step "Dropping collections in 'notifications' ..."

    $js = 'db.getCollectionNames().forEach(function(c){if(!c.startsWith("system."))db[c].drop();})'
    $out = docker exec $container mongosh --quiet `
        --username music_admin --password music_pass `
        --authenticationDatabase admin `
        notifications --eval $js 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Fail "MongoDB — $out" } else { Write-Ok "MongoDB (notifications) cleared" }
}

# ─── Neo4j ───────────────────────────────────────────────────────────────────
function Reset-Neo4j {
    $container = "music-neo4j"
    if (-not (Test-Container $container)) {
        Write-Skip "$container not running — skipped Neo4j"
        return
    }
    Write-Step "Deleting all Neo4j nodes and relationships ..."

    $cypher = "MATCH (n) DETACH DELETE n"
    $out = docker exec $container cypher-shell -u neo4j -p music_pass $cypher 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Fail "Neo4j — $out" } else { Write-Ok "Neo4j cleared" }
}

# ─── Redis ───────────────────────────────────────────────────────────────────
function Reset-Redis {
    $container = "music-redis"
    if (-not (Test-Container $container)) {
        Write-Skip "$container not running — skipped Redis"
        return
    }
    Write-Step "Flushing all Redis keys ..."

    $out = docker exec $container redis-cli -a music_pass --no-auth-warning FLUSHALL 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Fail "Redis — $out" } else { Write-Ok "Redis cleared" }
}

# ─── Elasticsearch ───────────────────────────────────────────────────────────
function Reset-Elasticsearch {
    $esUrl = "http://localhost:9200"
    Write-Step "Checking Elasticsearch at $esUrl ..."

    try {
        $health = Invoke-RestMethod -Uri "$esUrl/_cat/health?h=status" -Method GET -TimeoutSec 5
    } catch {
        Write-Skip "Elasticsearch not reachable — skipped"
        return
    }

    Write-Step "Deleting all user-created indices ..."
    $raw = Invoke-RestMethod -Uri "$esUrl/_cat/indices?h=index" -Method GET
    $indices = ($raw -split "`n" |
        Where-Object { $_.Trim() -ne "" -and -not $_.StartsWith(".") })
    if ($indices.Count -gt 0) {
        $joined = $indices -join ","
        Invoke-RestMethod -Uri "$esUrl/$joined" -Method DELETE | Out-Null
        Write-Ok "Elasticsearch indices deleted: $joined"
    } else {
        Write-Ok "Elasticsearch: no user indices found"
    }
}

# ─── MinIO ───────────────────────────────────────────────────────────────────
function Reset-MinIO {
    Write-Step "Removing MinIO objects (images + audio buckets) ..."

    # Single-quoted string avoids PS 5.1 parser issue with && in double-quoted strings
    $out = docker run --rm --network music-app-network `
        --entrypoint /bin/sh `
        minio/mc:latest `
        -c 'mc alias set local http://minio:9000 music_admin music_pass --quiet; mc rm --recursive --force local/images; mc rm --recursive --force local/audio; echo DONE' 2>&1

    if ($out -match "DONE") {
        Write-Ok "MinIO buckets cleared"
    } else {
        Write-Fail "MinIO — $out"
    }
}

# ─── Validation + confirmation ────────────────────────────────────────────────
$pgDbs = @("user_db","catalog_db","playlist_db","streaming_db","upload_db")
$valid = @("all","postgres") + $pgDbs + @("mongodb","neo4j","redis","elasticsearch","minio")
$t     = $Target.ToLower().Trim()

if ($t -notin $valid) {
    Write-Fail "Unknown target: '$Target'"
    Write-Host ""
    Write-Host "  Valid targets:" -ForegroundColor Yellow
    Write-Host ("    " + ($valid -join " | ")) -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  ╔══════════════════════════════╗" -ForegroundColor Red
Write-Host "  ║    DATABASE RESET SCRIPT     ║" -ForegroundColor Red
Write-Host "  ╚══════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "  Target: $($Target.ToUpper())" -ForegroundColor Yellow
Write-Host ""

$answer = ""
if (-not $Force) {
    try {
        $answer = Read-Host "  This will permanently delete data. Type yes to confirm"
    } catch {
        Write-Host "  Use -Force to skip confirmation in non-interactive mode." -ForegroundColor Yellow
        exit 0
    }
    if ($answer -ne "yes") {
        Write-Host "  Aborted." -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# ─── Dispatch ────────────────────────────────────────────────────────────────
switch ($t) {
    "all" {
        foreach ($db in $pgDbs) { Reset-Postgres $db }
        Reset-MongoDB
        Reset-Neo4j
        Reset-Redis
        Reset-Elasticsearch
        Reset-MinIO
    }
    "postgres" {
        foreach ($db in $pgDbs) { Reset-Postgres $db }
    }
    { $_ -in $pgDbs } {
        Reset-Postgres $t
    }
    "mongodb"       { Reset-MongoDB }
    "neo4j"         { Reset-Neo4j }
    "redis"         { Reset-Redis }
    "elasticsearch" { Reset-Elasticsearch }
    "minio"         { Reset-MinIO }
}

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
Write-Host ""
