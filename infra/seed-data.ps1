param(
    [Parameter(Mandatory)]
    [ValidateSet('docker', 'k8s')]
    [string]$Mode,

    [string]$DataDir = 'C:\Users\PC\Documents\Soulseek Downloads\data'
)

$ErrorActionPreference = 'Stop'
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom

$PasswordHash = '$2b$10$I8VDKXHPMrvEaz2YuD8ZPOTnSqOKcRc1mJ.x876LpgGl3M6hqKYTG'
$NS = 'music-app'

# ── Mode-specific wrappers ──────────────────────────────────────────────────

if ($Mode -eq 'docker') {
    function Invoke-Sql($db, $sql) {
        $sql | docker exec -i music-postgres psql -U music_admin -d $db -tA 2>$null | Out-Null
    }
    function Invoke-Neo4jCypher($cypher) {
        docker exec music-neo4j cypher-shell -u neo4j -p music_pass $cypher 2>$null | Out-Null
    }
} else {
    function Invoke-Sql($db, $sql) {
        $sql | kubectl exec -n $NS -i sts/postgres -- psql -U music_admin -d $db -tA 2>$null | Out-Null
    }
    function Invoke-Neo4jCypher($cypher) {
        kubectl exec -n $NS sts/neo4j -- cypher-shell -u neo4j -p music_pass $cypher 2>$null | Out-Null
    }
}

function Invoke-EsIndex($index, $id, $body) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        Invoke-RestMethod -Uri "http://localhost:${script:esPort}/${index}/_doc/${id}" `
            -Method POST -ContentType 'application/json' -Body $bytes | Out-Null
    } catch {}
}

function Initialize-EsIndices {
    $analyzer = '{"analysis":{"analyzer":{"vietnamese":{"type":"custom","tokenizer":"standard","filter":["lowercase"]}}}}'
    $indices = @{
        tracks = '{"settings":' + $analyzer + ',"mappings":{"properties":{"id":{"type":"keyword"},"title":{"type":"text","analyzer":"vietnamese","fields":{"keyword":{"type":"keyword"},"suggest":{"type":"completion","analyzer":"vietnamese"}}},"genre":{"type":"keyword"},"durationMs":{"type":"integer"},"coverUrl":{"type":"keyword","index":false,"doc_values":false},"playCount":{"type":"long"},"status":{"type":"keyword"},"releaseDate":{"type":"date"},"createdAt":{"type":"date"},"artist":{"properties":{"id":{"type":"keyword"},"name":{"type":"text","analyzer":"vietnamese","fields":{"keyword":{"type":"keyword"},"suggest":{"type":"completion","analyzer":"vietnamese"}}}}},"album":{"properties":{"id":{"type":"keyword"},"title":{"type":"text","analyzer":"vietnamese"}}}}}}'
        artists = '{"settings":' + $analyzer + ',"mappings":{"properties":{"id":{"type":"keyword"},"name":{"type":"text","analyzer":"vietnamese","fields":{"keyword":{"type":"keyword"},"suggest":{"type":"completion","analyzer":"vietnamese"}}},"avatarUrl":{"type":"keyword","index":false,"doc_values":false},"trackCount":{"type":"integer"},"genreTags":{"type":"keyword"}}}}'
        albums = '{"settings":' + $analyzer + ',"mappings":{"properties":{"id":{"type":"keyword"},"title":{"type":"text","analyzer":"vietnamese","fields":{"keyword":{"type":"keyword"}}},"coverUrl":{"type":"keyword","index":false,"doc_values":false},"releaseDate":{"type":"date"},"trackCount":{"type":"integer"},"artist":{"properties":{"id":{"type":"keyword"},"name":{"type":"text","analyzer":"vietnamese","fields":{"keyword":{"type":"keyword"}}}}}}}}'
    }
    foreach ($idx in $indices.Keys) {
        try {
            $exists = Invoke-RestMethod -Uri "http://localhost:${script:esPort}/${idx}" -Method HEAD -ErrorAction Stop
        } catch {
            try {
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($indices[$idx])
                Invoke-RestMethod -Uri "http://localhost:${script:esPort}/${idx}" `
                    -Method PUT -ContentType 'application/json' -Body $bytes | Out-Null
                Write-Host "  Created ES index: $idx" -ForegroundColor Cyan
            } catch {
                Write-Host "  [WARN] Failed to create ES index $idx" -ForegroundColor Yellow
            }
        }
    }
}

# ── Helpers ─────────────────────────────────────────────────────────────────

function Get-Slug($name) {
    ($name.ToLower() -replace '[^a-z0-9]', '-' -replace '-+', '-').Trim('-')
}

function Get-SqlSafe($s) {
    $s -replace "'", "''"
}

function Get-CypherSafe($s) {
    $s -replace '\\', '\\\\' -replace "'", "\'"
}

function Get-DurationMs($filePath) {
    try {
        $result = & ffprobe -v quiet -show_entries format=duration -of csv=p=0 $filePath 2>$null
        if ($result -and $result -ne 'N/A') {
            return [int]([double]$result * 1000)
        }
    } catch {}
    return 200000
}

function Invoke-McUpload($bucket, $key, $containerPath) {
    docker exec $script:mcId mc cp "$containerPath" "local/${bucket}/${key}" --quiet 2>$null | Out-Null
}

$Bitrates = @(128, 256, 320)
$hasFFmpeg = $null -ne (Get-Command ffmpeg -ErrorAction SilentlyContinue)
$transcodeDir = Join-Path ([System.IO.Path]::GetTempPath()) "music-seed-transcode-$(Get-Random)"
New-Item -ItemType Directory -Path $transcodeDir -Force | Out-Null

# ── Setup MinIO client container ────────────────────────────────────────────

Write-Host "`n======================================================" -ForegroundColor Green
Write-Host " Seeding data ($Mode) from: $DataDir"                      -ForegroundColor Green
Write-Host " Password for all users: Music@123"                        -ForegroundColor Green
if ($hasFFmpeg) {
    Write-Host " Transcoding: FLAC -> MP3 @ 128/256/320k"              -ForegroundColor Green
} else {
    Write-Host " [WARN] ffmpeg not found - skipping transcode"         -ForegroundColor Yellow
}
Write-Host "======================================================`n"  -ForegroundColor Green

$script:mcId = "mc-seed-$(Get-Random)"
$script:esPort = 9200
$pfProcess = $null
$esPfProcess = $null

try {
    # ── Elasticsearch access ──
    $esOk = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect('localhost', $script:esPort)
        $tcp.Close()
        $esOk = $true
        Write-Host "[Setup] Elasticsearch already accessible on localhost:$($script:esPort)" -ForegroundColor Cyan
    } catch {
        if ($Mode -eq 'k8s') {
            Write-Host "[Setup] Port-forwarding Elasticsearch on localhost:$($script:esPort)..." -ForegroundColor Cyan
            $esPfProcess = Start-Process -FilePath 'kubectl' `
                -ArgumentList "port-forward -n $NS svc/elasticsearch $($script:esPort):9200" `
                -PassThru -NoNewWindow -RedirectStandardOutput 'NUL'
            Start-Sleep -Seconds 3
        } else {
            Write-Host "[Setup] Exposing Elasticsearch via docker proxy on localhost:$($script:esPort)..." -ForegroundColor Cyan
            docker run -d --name es-proxy-seed --network music-app-network -p "$($script:esPort):9200" --entrypoint sh alpine/socat -c "socat TCP-LISTEN:9200,fork TCP:music-elasticsearch:9200" 2>$null | Out-Null
        }
    }

    # ── MinIO client container ──
    if ($Mode -eq 'docker') {
        Write-Host "[Setup] Starting MinIO client container..." -ForegroundColor Cyan
        docker run -d --name $mcId --network music-app-network -v "${DataDir}:/data:ro" -v "${transcodeDir}:/transcode" --entrypoint sh minio/mc:latest -c "sleep 3600" | Out-Null
        docker exec $mcId mc alias set local http://music-minio:9000 music_admin music_pass --quiet 2>$null | Out-Null
    } else {
        $minioPort = 9000
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect('localhost', $minioPort)
            $tcp.Close()
            Write-Host "[Setup] MinIO already accessible on localhost:$minioPort (reusing existing port-forward)" -ForegroundColor Cyan
        } catch {
            Write-Host "[Setup] Port-forwarding MinIO on localhost:$minioPort..." -ForegroundColor Cyan
            $pfProcess = Start-Process -FilePath 'kubectl' `
                -ArgumentList "port-forward -n $NS svc/minio ${minioPort}:9000" `
                -PassThru -NoNewWindow -RedirectStandardOutput 'NUL'
            Start-Sleep -Seconds 3
        }

        Write-Host "[Setup] Starting MinIO client container..." -ForegroundColor Cyan
        docker run -d --name $mcId -v "${DataDir}:/data:ro" -v "${transcodeDir}:/transcode" --entrypoint sh minio/mc:latest -c "sleep 3600" | Out-Null
        docker exec $mcId mc alias set local "http://host.docker.internal:$minioPort" music_admin music_pass --quiet 2>$null | Out-Null
    }

    # ── Ensure ES indices with proper mappings ──
    Write-Host "[Setup] Ensuring Elasticsearch indices..." -ForegroundColor Cyan
    Initialize-EsIndices

    Write-Host "[Setup] Done.`n" -ForegroundColor Cyan

    # ── Main loop ───────────────────────────────────────────────────────────

    foreach ($artistDir in Get-ChildItem $DataDir -Directory) {
        $artistName     = $artistDir.Name
        $artistNameSafe = Get-SqlSafe $artistName
        $slug           = Get-Slug $artistName

        $userId   = [guid]::NewGuid().ToString()
        $artistId = [guid]::NewGuid().ToString()
        $email    = "${slug}@musicapp.local"
        $avatarKey = "users/$userId/avatar.jpg"

        Write-Host "=== Artist: $artistName ===" -ForegroundColor Yellow

        # ── 1. Create user ────────────────────────────────────────────────
        Invoke-Sql user_db @"
INSERT INTO user_schema.users (id, email, password_hash, display_name, avatar_url, role, email_verified)
VALUES ('$userId', '$email', '$PasswordHash', '$artistNameSafe', '$avatarKey', 'USER', true)
ON CONFLICT (email) DO NOTHING;
"@

        # ── 2. Create artist ──────────────────────────────────────────────
        Invoke-Sql catalog_db @"
SET search_path TO catalog_schema;
INSERT INTO artists (id, user_id, name, avatar_url)
VALUES ('$artistId', '$userId', '$artistNameSafe', '$avatarKey');
"@

        # ── 3. Upload avatar ──────────────────────────────────────────────
        $avatarFile = Get-ChildItem $artistDir.FullName -File |
            Where-Object { $_.Extension -match '\.(jpg|jpeg|png)$' } |
            Select-Object -First 1

        if ($avatarFile) {
            $mcPath = "/data/$($artistDir.Name)/$($avatarFile.Name)"
            Invoke-McUpload 'images' $avatarKey $mcPath
            Write-Host "  Avatar uploaded"
        }

        $artistTrackTotal = 0

        # ── 4. Process albums ─────────────────────────────────────────────
        foreach ($albumDir in Get-ChildItem $artistDir.FullName -Directory) {
            $albumName     = $albumDir.Name
            $albumNameSafe = Get-SqlSafe $albumName
            $albumId       = [guid]::NewGuid().ToString()
            $coverKey      = "artworks/$albumId/cover_large.jpg"

            $flacFiles = Get-ChildItem $albumDir.FullName -File -Filter '*.flac' | Sort-Object Name
            if ($flacFiles.Count -eq 0) { continue }
            $trackCount = $flacFiles.Count
            $isSingle = $trackCount -eq 1

            # Upload cover (used for both album and single)
            $coverFile = Join-Path $albumDir.FullName 'cover.jpg'
            if (Test-Path $coverFile) {
                $mcCover = "/data/$($artistDir.Name)/$($albumDir.Name)/cover.jpg"
                Invoke-McUpload 'images' $coverKey $mcCover
            }

            if ($isSingle) {
                $albumId = $null
                Write-Host "  Single: $albumName"
            } else {
                Invoke-Sql catalog_db @"
SET search_path TO catalog_schema;
INSERT INTO albums (id, artist_id, title, cover_url, release_date)
VALUES ('$albumId', '$artistId', '$albumNameSafe', '$coverKey', CURRENT_DATE);
"@
                Write-Host "  Album: $albumName ($trackCount tracks)"
            }

            # ── 5. Process tracks ─────────────────────────────────────────
            foreach ($flac in $flacFiles) {
                $trackId  = [guid]::NewGuid().ToString()
                $basename = [System.IO.Path]::GetFileNameWithoutExtension($flac.Name)

                if ($basename -match '^\s*(\d+)\s*-\s*(.+)$') {
                    $trackNum   = [int]$Matches[1]
                    $trackTitle = $Matches[2].Trim()
                } else {
                    $trackNum   = 1
                    $trackTitle = $basename
                }

                $trackTitleSafe = Get-SqlSafe $trackTitle
                $fileSize       = $flac.Length
                $durationMs     = Get-DurationMs $flac.FullName
                $storageKey     = "originals/$trackId/source.flac"

                # Insert track
                $albumIdSql = if ($albumId) { "'$albumId'" } else { 'NULL' }
                Invoke-Sql catalog_db @"
SET search_path TO catalog_schema;
INSERT INTO tracks (id, artist_id, album_id, title, duration_ms, genre, cover_url, status, release_date)
VALUES ('$trackId', '$artistId', $albumIdSql, '$trackTitleSafe', $durationMs, 'Pop', '$coverKey', 'PUBLISHED', CURRENT_DATE);
"@

                # Insert original FLAC audio asset
                Invoke-Sql catalog_db @"
SET search_path TO catalog_schema;
INSERT INTO audio_assets (track_id, bitrate, format, storage_url, size_bytes)
VALUES ('$trackId', 0, 'flac', '$storageKey', $fileSize);
"@

                # Upload original FLAC to MinIO
                $mcTrack = "/data/$($artistDir.Name)/$($albumDir.Name)/$($flac.Name)"
                Invoke-McUpload 'audio' $storageKey $mcTrack

                # Transcode FLAC → MP3 at 128/256/320k
                $assetEntries = @('{"bitrate":0,"format":"flac","storageUrl":"' + $storageKey + '"}')

                if ($hasFFmpeg) {
                    $trackTmpDir = Join-Path $transcodeDir $trackId
                    New-Item -ItemType Directory -Path $trackTmpDir -Force | Out-Null

                    foreach ($br in $Bitrates) {
                        $mp3File = Join-Path $trackTmpDir "${br}k.mp3"
                        & ffmpeg -hide_banner -loglevel error -i $flac.FullName -b:a "${br}k" -map_metadata -1 -y $mp3File 2>$null

                        if (Test-Path $mp3File) {
                            $mp3Size = (Get-Item $mp3File).Length
                            $mp3Key = "streams/$trackId/${br}k.mp3"

                            Invoke-McUpload 'audio' $mp3Key "/transcode/$trackId/${br}k.mp3"

                            Invoke-Sql catalog_db @"
SET search_path TO catalog_schema;
INSERT INTO audio_assets (track_id, bitrate, format, storage_url, size_bytes)
VALUES ('$trackId', $br, 'mp3', '$mp3Key', $mp3Size);
"@
                            $assetEntries += '{"bitrate":' + $br + ',"format":"mp3","storageUrl":"' + $mp3Key + '"}'
                        }
                    }

                    Remove-Item $trackTmpDir -Recurse -Force -ErrorAction SilentlyContinue
                }

                # Insert track_cache for streaming service
                $assetJson = '[' + ($assetEntries -join ',') + ']'
                Invoke-Sql streaming_db @"
INSERT INTO track_cache (track_id, title, duration_ms, genre, artist_id, artist_name, cover_url, asset_urls)
VALUES ('$trackId', '$trackTitleSafe', $durationMs, 'Pop', '$artistId', '$artistNameSafe', '$coverKey', '$assetJson')
ON CONFLICT (track_id) DO NOTHING;
"@

                # Index track in Elasticsearch
                $esDoc = @{
                    id         = $trackId
                    title      = $trackTitle
                    genre      = 'Pop'
                    durationMs = $durationMs
                    coverUrl   = $coverKey
                    playCount  = 0
                    status     = 'PUBLISHED'
                    releaseDate = (Get-Date -Format 'yyyy-MM-dd')
                    createdAt  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
                    artist     = @{ id = $artistId; name = $artistName }
                }
                if ($albumId) { $esDoc.album = @{ id = $albumId; title = $albumName } }
                $esDoc = $esDoc | ConvertTo-Json -Compress -Depth 3
                Invoke-EsIndex 'tracks' $trackId $esDoc

                # Neo4j: Track + Artist + Genre nodes + relationships
                $trackTitleNeo = Get-CypherSafe $trackTitle
                $artistNameNeo = Get-CypherSafe $artistName
                Invoke-Neo4jCypher "MERGE (t:Track {id: '$trackId'}) SET t.title = '$trackTitleNeo', t.genre = 'Pop', t.coverUrl = '$coverKey', t.playCount = 0 WITH t MERGE (g:Genre {name: 'Pop'}) MERGE (t)-[:IN_GENRE]->(g) WITH t, g MERGE (a:Artist {id: '$artistId'}) ON CREATE SET a.name = '$artistNameNeo' MERGE (t)-[:BY]->(a) MERGE (a)-[:IN_GENRE]->(g)"

                Write-Host "    #${trackNum}: $trackTitle"
            }

            $artistTrackTotal += $trackCount

            # Index album in Elasticsearch (skip singles)
            if (-not $isSingle) {
                $esDoc = @{
                    id         = $albumId
                    title      = $albumName
                    coverUrl   = $coverKey
                    releaseDate = (Get-Date -Format 'yyyy-MM-dd')
                    trackCount = $trackCount
                    artist     = @{ id = $artistId; name = $artistName }
                } | ConvertTo-Json -Compress -Depth 3
                Invoke-EsIndex 'albums' $albumId $esDoc
            }
        }

        # Index artist in Elasticsearch
        $esDoc = @{
            id         = $artistId
            name       = $artistName
            avatarUrl  = $avatarKey
            trackCount = $artistTrackTotal
        } | ConvertTo-Json -Compress -Depth 3
        Invoke-EsIndex 'artists' $artistId $esDoc

        Write-Host ""
    }
} finally {
    Write-Host "[Cleanup] Removing temporary containers..." -ForegroundColor Cyan
    docker rm -f $mcId 2>$null | Out-Null
    docker rm -f es-proxy-seed 2>$null | Out-Null
    Remove-Item $transcodeDir -Recurse -Force -ErrorAction SilentlyContinue
    if ($pfProcess) {
        try { Stop-Process -Id $pfProcess.Id -ErrorAction Stop } catch {}
    }
    if ($esPfProcess) {
        try { Stop-Process -Id $esPfProcess.Id -ErrorAction Stop } catch {}
    }
}

Write-Host "======================================================" -ForegroundColor Green
Write-Host " Seed complete!"                                        -ForegroundColor Green
Write-Host " Users created with password: Music@123"                -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
