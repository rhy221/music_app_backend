# Database Architecture — Polyglot Music Streaming

> Project 03 · Go + Java + TypeScript + Python · Nx Monorepo · Polyglot Persistence  
> 7 loại data store, mỗi loại được chọn vì đặc tính workload cụ thể.

---

## Mục lục

1. [Tổng quan kiến trúc data](#1-tổng-quan-kiến-trúc-data)
2. [Danh sách databases](#2-danh-sách-databases)
3. [Chi tiết từng database](#3-chi-tiết-từng-database)
   - 3.1 PostgreSQL — User DB
   - 3.2 PostgreSQL — Catalog DB
   - 3.3 PostgreSQL — Playlist DB
   - 3.4 PostgreSQL — Streaming DB
   - 3.5 PostgreSQL — Upload DB
   - 3.6 Neo4j — Recommend Graph DB
   - 3.7 MongoDB — Notification DB
   - 3.8 Elasticsearch — Search Index
   - 3.9 Redis — Cache Layer
   - 3.10 MinIO — Object Storage
   - 3.11 RabbitMQ — Event Bus
4. [Tại sao chọn từng loại database](#4-tại-sao-chọn-từng-loại-database)
5. [Thư viện tương tác database theo ngôn ngữ](#5-thư-viện-tương-tác-database-theo-ngôn-ngữ)
6. [Data flow giữa các database](#6-data-flow-giữa-các-database)
   - 6.1 Upload Saga: file → MinIO → transcode → Catalog → Search
   - 6.2 Play tracking → Neo4j recommendation
   - 6.3 CQRS: Catalog write → Search/Cache read
   - 6.4 Notification fan-out → MongoDB + WebSocket
7. [Saga Pattern chi tiết](#7-saga-pattern-chi-tiết)
8. [CQRS Pattern chi tiết](#8-cqrs-pattern-chi-tiết)
9. [Database migration strategy](#9-database-migration-strategy)
10. [Backup & disaster recovery](#10-backup--disaster-recovery)

---

## 1. Tổng quan kiến trúc data

Hệ thống áp dụng **Polyglot Persistence** — mỗi service chọn loại database phù hợp nhất với workload của nó, thay vì ép tất cả vào một loại DB duy nhất. Nguyên tắc **Database-per-Service**: không có service nào được truy cập trực tiếp vào data của service khác. Khi cần data từ context khác, service sử dụng:

- **Synchronous REST call**: gọi internal API của service chủ sở hữu.
- **Event-driven sync**: subscribe domain events qua RabbitMQ để duy trì local copy.
- **Batch API**: gọi `/internal/batch` endpoint để resolve nhiều IDs cùng lúc.

Hệ thống sử dụng **7 loại data store**:

| Loại | Công nghệ | Vai trò | Services |
|---|---|---|---|
| Relational DB | PostgreSQL 16 | Source of truth cho business data | User, Catalog, Playlist, Streaming, Upload |
| Graph DB | Neo4j 5 (Community) | Collaborative filtering, graph traversal | Recommend |
| Document DB | MongoDB 7 | Notifications với TTL, flexible schema | Notification |
| Search Engine | Elasticsearch 8 | Full-text search, CQRS read model | Search |
| In-memory Cache | Redis 7 | Cache, session, pub/sub, rate limit | Multi-service |
| Object Storage | MinIO | Audio files, cover art, waveforms | Upload, Streaming |
| Message Broker | RabbitMQ 3.13 | Event bus, async communication | All services |

---

## 2. Danh sách databases

| Database | Owner Service | Ngôn ngữ | Loại DB | Dung lượng ước tính | Lý do chọn loại này |
|---|---|---|---|---|---|
| `user_schema` | User Service | Java | PostgreSQL | ~100MB | ACID cho auth, Spring Security mature |
| `catalog_schema` | Catalog Service | Java | PostgreSQL | ~1GB | Complex relations (Track→Album→Artist), JPA Specs |
| `playlist_schema` | Playlist Service | Java | PostgreSQL | ~500MB | DDD Aggregate Root, @Transactional consistency |
| `streaming_schema` | Streaming Service | Go | PostgreSQL | ~5GB+ | Time-series play sessions, partitioning |
| `upload_schema` | Upload Service | Go | PostgreSQL | ~50MB | Saga state machine, job tracking |
| Neo4j graph | Recommend Service | Python | Neo4j | ~500MB | 2-hop traversal, GDS algorithms, realtime |
| `notifications` | Notification Service | TypeScript | MongoDB | ~200MB | TTL auto-delete, flexible schema per type |
| `tracks` index | Search Service | TypeScript | Elasticsearch | ~2GB | Full-text search, Vietnamese analyzer |
| Redis | Multi-service | Multi | Redis | ~200MB | Cache, counters, presence |
| MinIO buckets | Upload, Streaming | Go | Object Store | Variable | Audio files (5-50MB/track) |
| RabbitMQ | All services | Multi | Message Broker | Transient | Domain events, job queues |

---

## 3. Chi tiết từng database

### 3.1 PostgreSQL — User DB

**Owner:** User Service (Java / Spring Boot)  
**Schema name:** `user_schema`  
**Migration tool:** Flyway

```sql
-- V1__create_users.sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    bio             TEXT,
    avatar_url      VARCHAR(512),
    role            VARCHAR(20) NOT NULL DEFAULT 'LISTENER',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

-- V2__create_oauth_accounts.sql
CREATE TABLE oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,
    provider_id     VARCHAR(255) NOT NULL,
    access_token    TEXT,
    refresh_token   TEXT,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);

-- V3__create_refresh_tokens.sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token) WHERE NOT revoked;

-- V4__create_follows.sql
CREATE TABLE follows (
    follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON follows (following_id);
```

**Ai truy cập:** Chỉ User Service (R/W). Các service khác gọi REST `/api/v1/internal/users/{id}` hoặc `/internal/users/batch`.

---

### 3.2 PostgreSQL — Catalog DB

**Owner:** Catalog Service (Java / Spring Boot)  
**Schema name:** `catalog_schema`  
**Migration tool:** Flyway

```sql
CREATE TABLE artists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    name            VARCHAR(100) NOT NULL,
    bio             TEXT,
    avatar_url      VARCHAR(512),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE albums (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id       UUID NOT NULL REFERENCES artists(id),
    title           VARCHAR(255) NOT NULL,
    cover_url       VARCHAR(512),
    release_date    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tracks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id       UUID NOT NULL REFERENCES artists(id),
    album_id        UUID REFERENCES albums(id),
    title           VARCHAR(255) NOT NULL,
    duration_ms     INTEGER NOT NULL,
    genre           VARCHAR(50),
    cover_url       VARCHAR(512),
    waveform_url    VARCHAR(512),
    play_count      BIGINT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    release_date    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracks_artist ON tracks (artist_id);
CREATE INDEX idx_tracks_genre ON tracks (genre);
CREATE INDEX idx_tracks_play_count ON tracks (play_count DESC);
CREATE INDEX idx_tracks_created ON tracks (created_at DESC);

CREATE TABLE audio_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    bitrate         INTEGER NOT NULL,
    format          VARCHAR(10) NOT NULL,
    storage_url     VARCHAR(1024) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_assets_track_bitrate ON audio_assets (track_id, bitrate);
```

**CQRS note:** Catalog DB là write side (source of truth). Read side là Elasticsearch (denormalized documents). Khi CRUD → publish domain events → Search Service re-index ES.

---

### 3.3 PostgreSQL — Playlist DB

**Owner:** Playlist Service (Java / Spring Boot)  
**Schema name:** `playlist_schema`  
**Migration tool:** Flyway  
**DDD Pattern:** Aggregate Root (Playlist) → Entity (PlaylistItem, Collaborator)

```sql
CREATE TABLE playlists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            UUID NOT NULL,
    name                VARCHAR(100) NOT NULL,
    description         TEXT,
    visibility          VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    track_count         INTEGER NOT NULL DEFAULT 0,
    total_duration_ms   BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_track_count CHECK (track_count <= 1000)
);

CREATE TABLE playlist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id     UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id        UUID NOT NULL,
    position        INTEGER NOT NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by        UUID NOT NULL,
    -- Denormalized from Catalog events (no JOIN)
    track_title     VARCHAR(255),
    track_duration  INTEGER,
    track_cover_url VARCHAR(512),
    artist_name     VARCHAR(100),
    UNIQUE (playlist_id, track_id)
);

CREATE TABLE collaborators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id     UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    role            VARCHAR(20) NOT NULL,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_name    VARCHAR(100),
    avatar_url      VARCHAR(512),
    UNIQUE (playlist_id, user_id)
);
```

**Tại sao PostgreSQL, không phải MongoDB?** Playlist cần `@Transactional` để đảm bảo `track_count` sync với số items thực tế (DDD invariant). Reorder operation (move item 500→10) là 1 SQL UPDATE — MongoDB phải rewrite toàn bộ embedded array.

---

### 3.4 PostgreSQL — Streaming DB

**Owner:** Streaming Service (Go)  
**Schema name:** `streaming_schema`  
**Migration tool:** golang-migrate

```sql
CREATE TABLE play_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    track_id        UUID NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    position_ms     INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL DEFAULT 0,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PLAYING',
    source          VARCHAR(30),
    bitrate         INTEGER
) PARTITION BY RANGE (started_at);

-- Monthly partitions
CREATE TABLE play_sessions_2025_06 PARTITION OF play_sessions
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE play_sessions_2025_07 PARTITION OF play_sessions
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE INDEX idx_sessions_user ON play_sessions (user_id, started_at DESC);
CREATE INDEX idx_sessions_track ON play_sessions (track_id);

-- Local cache from Catalog events (CQRS read model)
CREATE TABLE track_cache (
    track_id        UUID PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    duration_ms     INTEGER NOT NULL,
    genre           VARCHAR(50),
    artist_id       UUID,
    artist_name     VARCHAR(100),
    asset_urls      JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Tại sao PostgreSQL, không phải Cassandra?** Scale hiện tại (~200K writes/ngày = 2.3/s) không justify Cassandra (cần ≥50K/s). Table partitioning theo tháng + Redis buffer cho play counts là giải pháp tối ưu. `DROP PARTITION` xóa data cũ instantly.

---

### 3.5 PostgreSQL — Upload DB

**Owner:** Upload & Transcode Service (Go)  
**Schema name:** `upload_schema`  
**Migration tool:** golang-migrate

```sql
CREATE TABLE upload_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id         UUID NOT NULL,
    original_filename   VARCHAR(512) NOT NULL,
    original_format     VARCHAR(20),
    original_size_bytes BIGINT,
    original_duration_ms INTEGER,
    title               VARCHAR(255) NOT NULL,
    genre               VARCHAR(50),
    album_id            UUID,
    storage_url         VARCHAR(1024),
    waveform_url        VARCHAR(1024),
    status              VARCHAR(20) NOT NULL DEFAULT 'UPLOADING',
    -- UPLOADING → TRANSCODING → PUBLISHING → PUBLISHED | FAILED | CANCELLED
    track_id            UUID,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_uploader ON upload_jobs (uploader_id, created_at DESC);
CREATE INDEX idx_jobs_status ON upload_jobs (status);

CREATE TABLE transcode_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES upload_jobs(id) ON DELETE CASCADE,
    target_bitrate  INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    output_url      VARCHAR(1024),
    output_size_bytes BIGINT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    error_message   TEXT
);
```

---

### 3.6 Neo4j — Recommend Graph DB

**Owner:** Recommendation Service (Python / FastAPI)  
**Version:** Neo4j 5 Community Edition  
**Driver:** `neo4j` Python driver (async)

**Tại sao Neo4j thay vì PostgreSQL + scikit-learn?**

Music recommendation là bài toán graph bẩm sinh: "Tôi nghe Track A → Bob cũng nghe Track A → Bob còn nghe Track D → gợi ý Track D cho tôi" = 2-hop traversal. Neo4j giải quyết 3 vấn đề lớn nhất: (1) realtime thay batch rebuild, (2) Cypher đọc như tiếng Anh thay SQL self-joins, (3) built-in GDS algorithms.

**Graph model:**

```cypher
// Node types
(:User {id: "uuid", displayName: "...", avatarUrl: "..."})
(:Track {id: "uuid", title: "...", durationMs: 240000, coverUrl: "...", playCount: 5000})
(:Artist {id: "uuid", name: "...", avatarUrl: "..."})
(:Genre {name: "POP"})
(:Album {id: "uuid", title: "...", coverUrl: "..."})

// Relationship types
(user)-[:LISTENED {times: 5, totalMs: 18000, lastPlayedAt: datetime()}]->(track)
(user)-[:FOLLOWS]->(otherUser)
(user)-[:SAVED]->(track)
(track)-[:BY]->(artist)
(track)-[:IN_ALBUM]->(album)
(track)-[:IN_GENRE]->(genre)
(artist)-[:IN_GENRE]->(genre)
(album)-[:BY]->(artist)
```

**Indexes và constraints:**

```cypher
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT track_id IF NOT EXISTS FOR (t:Track) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT genre_name IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE;
CREATE CONSTRAINT album_id IF NOT EXISTS FOR (a:Album) REQUIRE a.id IS UNIQUE;

CREATE INDEX user_name IF NOT EXISTS FOR (u:User) ON (u.displayName);
CREATE INDEX track_genre IF NOT EXISTS FOR (t:Track) ON (t.genre);
```

**Core recommendation queries:**

```cypher
// Collaborative filtering: users who listened to same tracks → what else?
MATCH (me:User {id: $userId})-[:LISTENED]->(t:Track)<-[:LISTENED]-(other:User)
      -[:LISTENED]->(rec:Track)
WHERE NOT (me)-[:LISTENED]->(rec)
  AND me <> other
WITH rec, COUNT(DISTINCT other) AS collaborativeScore
OPTIONAL MATCH (me)-[:LISTENED]->(:Track)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(rec)
WITH rec, collaborativeScore, COUNT(DISTINCT g) AS genreOverlap
RETURN rec {.id, .title, .genre, .coverUrl, .playCount},
       collaborativeScore + genreOverlap AS score,
       collaborativeScore, genreOverlap
ORDER BY score DESC LIMIT 20

// Similar tracks (content-based + co-listen)
MATCH (seed:Track {id: $trackId})<-[:LISTENED]-(u:User)-[:LISTENED]->(similar:Track)
WHERE seed <> similar
WITH similar, COUNT(DISTINCT u) AS coListenScore
OPTIONAL MATCH (seed)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(similar)
WITH similar, coListenScore, COUNT(g) AS genreMatch
RETURN similar {.id, .title, .genre, .coverUrl},
       coListenScore + genreMatch * 2 AS score
ORDER BY score DESC LIMIT 10

// Radio mode: seed track → expanding circles
MATCH (seed:Track {id: $trackId})-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(rec:Track)
WHERE seed <> rec
WITH rec, g
OPTIONAL MATCH (rec)<-[:LISTENED]-(u:User)
WITH rec, g, COUNT(u) AS popularity
RETURN rec {.id, .title, .genre, .coverUrl}, popularity
ORDER BY popularity DESC LIMIT 25

// Discover Weekly: taste communities via GDS
CALL gds.nodeSimilarity.stream('music-graph', {
  nodeLabels: ['User'],
  relationshipTypes: ['LISTENED'],
  topK: 10
})
YIELD node1, node2, similarity
WITH gds.util.asNode(node1) AS me, gds.util.asNode(node2) AS similar, similarity
WHERE me.id = $userId
MATCH (similar)-[:LISTENED]->(rec:Track)
WHERE NOT (me)-[:LISTENED]->(rec)
RETURN rec {.id, .title, .genre}, similarity AS score
ORDER BY score DESC LIMIT 30
```

**Data ingestion (from TrackPlayed events):**

```python
# Python FastAPI consumer
async def handle_track_played(event: TrackPlayedEvent):
    async with neo4j_driver.session() as session:
        await session.run("""
            MERGE (u:User {id: $userId})
            MERGE (t:Track {id: $trackId})
            ON CREATE SET t.title = $title, t.genre = $genre,
                          t.coverUrl = $coverUrl, t.durationMs = $durationMs
            MERGE (u)-[r:LISTENED]->(t)
            ON CREATE SET r.times = 1, r.totalMs = $listenedMs,
                          r.lastPlayedAt = datetime()
            ON MATCH SET r.times = r.times + 1,
                         r.totalMs = r.totalMs + $listenedMs,
                         r.lastPlayedAt = datetime()
            WITH t
            MERGE (g:Genre {name: $genre})
            MERGE (t)-[:IN_GENRE]->(g)
            WITH t
            MERGE (a:Artist {id: $artistId})
            ON CREATE SET a.name = $artistName
            MERGE (t)-[:BY]->(a)
            MERGE (a)-[:IN_GENRE]->(g)
        """, **event.data)
```

**Cold-start fallback:** User mới chưa có listening history → graph không có edges → scikit-learn content-based fallback: hỏi genre preferences khi onboard → gợi ý popular tracks trong genres đó. Sau 10-20 plays, Neo4j take over.

---

### 3.7 MongoDB — Notification DB

**Owner:** Notification Service (TypeScript / Fastify)  
**Version:** MongoDB 7  
**ODM:** Mongoose  

**Tại sao MongoDB thay vì PostgreSQL?**

5 đặc tính notification data khớp hoàn hảo với MongoDB: (1) documents độc lập — không relationships, không JOIN, không transactions, (2) native TTL index tự xóa notification cũ (zero maintenance), (3) schema linh hoạt — mỗi notification type có `data` field khác nhau, (4) TypeScript + Mongoose là combo tự nhiên nhất, (5) per-document TTL — VIP giữ 1 năm, free user giữ 30 ngày.

**Mongoose schemas:**

```javascript
// notifications collection
const NotificationSchema = new Schema({
  userId:    { type: String, required: true, index: true },
  type:      {
    type: String,
    enum: ['NEW_FOLLOWER', 'PLAYLIST_SHARED', 'COLLABORATOR_ADDED',
           'TRACK_ADDED_TO_PLAYLIST', 'NEW_RELEASE', 'TRANSCODE_FAILED', 'SYSTEM'],
    required: true
  },
  title:     { type: String, required: true },
  body:      String,
  read:      { type: Boolean, default: false },
  data:      Schema.Types.Mixed,  // flexible per notification type
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

// TTL index — MongoDB auto-deletes expired documents
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Query indexes
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
```

```javascript
// notification_preferences collection
const PreferencesSchema = new Schema({
  userId:               { type: String, required: true, unique: true },
  emailEnabled:         { type: Boolean, default: true },
  pushEnabled:          { type: Boolean, default: true },
  newFollower:          { type: Boolean, default: true },
  playlistShared:       { type: Boolean, default: true },
  newRelease:           { type: Boolean, default: true },
  collaboratorActivity: { type: Boolean, default: true }
});
```

**Example documents (flexible data per type):**

```json
// NEW_FOLLOWER notification
{
  "_id": "ObjectId(...)",
  "userId": "uuid-of-recipient",
  "type": "NEW_FOLLOWER",
  "title": "Bạn có follower mới",
  "body": "Alice started following you",
  "read": false,
  "data": {
    "followerId": "uuid-of-alice",
    "followerName": "Alice",
    "followerAvatar": "https://..."
  },
  "createdAt": "2025-06-01T10:00:00Z",
  "expiresAt": "2025-09-01T10:00:00Z"   // 90 days
}

// PLAYLIST_SHARED notification — data structure completely different
{
  "_id": "ObjectId(...)",
  "userId": "uuid-of-recipient",
  "type": "PLAYLIST_SHARED",
  "title": "Playlist được chia sẻ",
  "body": "Bob shared 'Chill Vibes' with you",
  "read": false,
  "data": {
    "playlistId": "uuid",
    "playlistName": "Chill Vibes",
    "ownerId": "uuid-of-bob",
    "ownerName": "Bob"
  },
  "createdAt": "2025-06-01T10:00:00Z",
  "expiresAt": "2025-12-01T10:00:00Z"   // 6 months (important notif)
}
```

**Per-document TTL logic:**

```typescript
// Khi tạo notification, set expiresAt based on type
function getExpiry(type: string): Date {
  const now = new Date();
  switch (type) {
    case 'SYSTEM':           return addDays(now, 7);    // 7 ngày
    case 'TRANSCODE_FAILED': return addDays(now, 30);   // 30 ngày
    case 'NEW_FOLLOWER':     return addDays(now, 90);   // 90 ngày
    case 'PLAYLIST_SHARED':  return addDays(now, 180);  // 6 tháng
    case 'NEW_RELEASE':      return addDays(now, 365);  // 1 năm
    default:                 return addDays(now, 90);
  }
}
```

---

### 3.8 Elasticsearch — Search Index

**Owner:** Search Service (TypeScript / Fastify)  
**Version:** Elasticsearch 8  
**Vai trò:** CQRS read model cho Catalog data

```json
{
  "mappings": {
    "properties": {
      "id":          { "type": "keyword" },
      "title":       { "type": "text", "analyzer": "vietnamese_analyzer",
                       "fields": {
                         "keyword": { "type": "keyword" },
                         "suggest": { "type": "completion" }
                       }},
      "genre":       { "type": "keyword" },
      "durationMs":  { "type": "integer" },
      "coverUrl":    { "type": "keyword", "index": false },
      "playCount":   { "type": "long" },
      "status":      { "type": "keyword" },
      "releaseDate": { "type": "date" },
      "createdAt":   { "type": "date" },
      "artist": {
        "properties": {
          "id":   { "type": "keyword" },
          "name": { "type": "text", "analyzer": "vietnamese_analyzer",
                    "fields": {
                      "keyword": { "type": "keyword" },
                      "suggest": { "type": "completion" }
                    }}
        }
      },
      "album": {
        "properties": {
          "id":    { "type": "keyword" },
          "title": { "type": "text", "analyzer": "vietnamese_analyzer" }
        }
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "vietnamese_analyzer": {
          "type": "custom",
          "tokenizer": "icu_tokenizer",
          "filter": ["icu_folding", "lowercase"]
        }
      }
    }
  }
}
```

Sync từ Catalog qua events: `TrackPublished` → upsert, `TrackUpdated` → update, `TrackDeleted` → delete. ES document là **denormalized** — chứa luôn artist name, album title.

---

### 3.9 Redis — Cache Layer

**Version:** Redis 7  
**Vai trò:** Multi-purpose in-memory store

| Use case | Key pattern | TTL | Service |
|---|---|---|---|
| JWT blacklist | `session:{userId}` | 24h | User (Java) |
| API response cache | `cache:tracks:popular:{genre}` | 5 min | Catalog (Java) |
| Playlist cache | `cache:playlist:{id}` | 10 min | Playlist (Java) |
| Rate limiting | `ratelimit:{ip}:{endpoint}` | 1 min | Gateway (Go) |
| Track metadata cache | `track:{trackId}` | 1h | Streaming (Go) |
| Recommendation cache | `recs:{userId}` | 30 min | Recommend (Python) |
| Online presence | `online:{userId}` | 5 min | Notification (TS) |
| Unread count | `unread:{userId}` | — | Notification (TS) |
| Play count buffer | `playcount:{trackId}` | — | Streaming (Go) |

---

### 3.10 MinIO — Object Storage

**Version:** MinIO (S3-compatible)

| Bucket | Nội dung | Write | Read |
|---|---|---|---|
| `audio-originals` | File gốc (upload) | Upload (Go) | Internal only |
| `audio-transcoded` | 128k/256k/320k | Upload (Go) | Streaming (Go) via presigned URL |
| `images` | Cover art, avatars | Catalog (Java), User (Java) | Public CDN |
| `waveforms` | Waveform data | Upload (Go) | Streaming (Go) |

---

### 3.11 RabbitMQ — Event Bus

**Version:** RabbitMQ 3.13

| Exchange | Type | Producers | Key consumers |
|---|---|---|---|
| `events.upload` | topic | Upload (Go) | Catalog (Java), Notification (TS) |
| `events.catalog` | topic | Catalog (Java) | Search (TS), Streaming (Go), Playlist (Java), Neo4j sync |
| `events.streaming` | topic | Streaming (Go) | Recommend/Neo4j (Python), Catalog (Java) |
| `events.user` | topic | User (Java) | Notification (TS), Playlist (Java) |
| `events.playlist` | topic | Playlist (Java) | Notification (TS) |

---

## 4. Tại sao chọn từng loại database

| Database | Use case | Tại sao không dùng alternative |
|---|---|---|
| **PostgreSQL** (5 services) | Relational business data, ACID, complex queries | MongoDB: playlist cần @Transactional. Cassandra: scale chưa đủ. |
| **Neo4j** (Recommend) | Graph traversal 2-hop, collaborative filtering, GDS algorithms | PostgreSQL: self-JOIN O(n²), batch rebuild chậm, query không tự nhiên. |
| **MongoDB** (Notification) | TTL per-document, flexible schema, no relationships | PostgreSQL: cần pg_cron + DELETE + VACUUM cho TTL, JSONB untyped. |
| **Elasticsearch** (Search) | Full-text search, Vietnamese, fuzzy, autocomplete | PostgreSQL tsvector: hạn chế fuzzy, không có completion suggester. |
| **Redis** (Cache) | Sub-ms response, atomic counters, pub/sub | Không có alternative cho in-memory cache ở mức này. |
| **MinIO** (Storage) | S3 API, presigned URLs, audio files 5-50MB | PostgreSQL BLOB: bloat DB, no HTTP Range, no lifecycle. |
| **RabbitMQ** (Events) | Reliable delivery, routing, dead-letter, cross-language | Kafka: overkill cho scale này, operational complexity cao hơn. |

---

## 5. Thư viện tương tác database theo ngôn ngữ

### Go services (Streaming, Upload, Gateway)

| Database | Library | Ghi chú |
|---|---|---|
| PostgreSQL | `jackc/pgx` v5 | Pure Go, connection pool, prepared statements |
| PostgreSQL migrations | `golang-migrate/migrate` | SQL-first, up/down migrations |
| Redis | `redis/go-redis` v9 | Pipeline, pub/sub, cluster |
| MinIO | `minio/minio-go` v7 | S3 SDK, presigned URLs |
| RabbitMQ | `rabbitmq/amqp091-go` | AMQP 0.9.1, publish/consume |

### Java services (User, Catalog, Playlist)

| Database | Library | Ghi chú |
|---|---|---|
| PostgreSQL | Spring Data JPA + Hibernate 6 | Repository, JPQL, Specifications |
| PostgreSQL driver | `org.postgresql:postgresql` | JDBC |
| Migrations | Flyway | SQL-first, auto-run on startup |
| Redis | Spring Data Redis + Lettuce | `@Cacheable`, `@CacheEvict` |
| MinIO | `io.minio:minio` Java SDK | Cover art upload |
| RabbitMQ | Spring AMQP | `@RabbitListener`, `RabbitTemplate` |

### TypeScript services (Notification, Search)

| Database | Library | Ghi chú |
|---|---|---|
| MongoDB | `mongoose` 8 | Notification ODM, schema validation, TTL |
| Elasticsearch | `@elastic/elasticsearch` v8 | Search client, typed |
| Redis | `ioredis` | Presence, unread count, pub/sub |
| RabbitMQ | `amqplib` | Event consumer |

### Python service (Recommend)

| Database | Library | Ghi chú |
|---|---|---|
| Neo4j | `neo4j` (async driver) | Graph queries, GDS client |
| Redis | `redis-py` (aioredis) | Recommendation cache |
| RabbitMQ | `aio-pika` | Async TrackPlayed consumer |
| scikit-learn | `scikit-learn` | Cold-start content-based fallback |

---

## 6. Data flow giữa các database

### 6.1 Upload Saga: file → MinIO → transcode → Catalog → Search

```
Artist uploads file
    │
    ▼
Upload Service (Go)
    ├──→ MinIO: audio-originals/{jobId}/file.mp3
    ├──→ upload_db: INSERT upload_jobs (status=UPLOADING)
    └──→ RabbitMQ: TrackUploadedEvent
              │
              ▼
Transcode Worker (Go) — self-consume
    ├──→ upload_db: UPDATE status=TRANSCODING
    ├──→ FFmpeg: transcode 128k, 256k, 320k
    ├──→ MinIO: audio-transcoded/{trackId}/320.mp3
    ├──→ upload_db: UPDATE transcode_tasks (COMPLETED)
    └──→ RabbitMQ: TranscodeCompletedEvent
              │
              ▼
Catalog Service (Java) — consume
    ├──→ catalog_db: INSERT tracks + audio_assets
    └──→ RabbitMQ: TrackPublishedEvent
              │
              ├──→ Search (TS): index ES document
              ├──→ Streaming (Go): update track_cache
              ├──→ Neo4j: MERGE Track + Genre + Artist nodes
              ├──→ Notification (TS): notify followers → MongoDB
              └──→ Upload (Go): update status=PUBLISHED, track_id=...

COMPENSATION (if transcode fails):
    Upload (Go) ──→ MinIO: DELETE files
    Upload (Go) ──→ upload_db: status=FAILED
    Upload (Go) ──→ RabbitMQ: TranscodeFailedEvent
                 ──→ Notification: email uploader (MongoDB doc)
```

### 6.2 Play tracking → Neo4j recommendation

```
User bấm Play
    │
    ▼
Streaming Service (Go)
    ├──→ streaming_db: INSERT play_sessions (status=PLAYING)
    ├──→ Heartbeat mỗi 10s: UPDATE position_ms
    │
    │    Khi đạt ngưỡng (≥30s hoặc ≥50%):
    ├──→ streaming_db: UPDATE completed=TRUE
    ├──→ Redis: INCR playcount:{trackId}
    └──→ RabbitMQ: TrackPlayedEvent
              │         {userId, trackId, genre, artistId, durationMs}
              │
              ├──→ Neo4j (Python): MERGE (user)-[:LISTENED]->(track)
              │    Realtime! Query recommendation phản ánh ngay.
              │
              ├──→ Catalog (Java): batch increment play_count
              │    (Redis buffer → flush mỗi 5 phút)
              │
              └──→ Notification (TS): milestone notifications
                   (MongoDB: "Bạn đã nghe 1000 bài!")

User request recommendations:
    │
    ▼
Recommend Service (Python)
    ├──→ Redis: GET recs:{userId}  (cache hit → return)
    ├──→ Neo4j: Cypher 2-hop traversal (cache miss)
    │    MATCH (me)-[:LISTENED]->(t)<-[:LISTENED]-(other)
    │          -[:LISTENED]->(rec)
    │    WHERE NOT (me)-[:LISTENED]->(rec)
    └──→ Redis: SET recs:{userId} (cache 30 min)
```

### 6.3 CQRS: Catalog write → Search/Cache read

```
         COMMAND SIDE                    QUERY SIDE

POST/PUT/DELETE tracks              GET search, browse, detail
    │                                    │
    ▼                                    ▼
Catalog Service (Java)              Search Service (TS)
    │                                    │        │
    ▼                                    ▼        ▼
PostgreSQL                          Elasticsearch  Redis
catalog_db                          denormalized   hot cache
(normalized,                        documents      (5 min TTL)
 ACID,                              (eventual
 source of truth)                    consistent)
    │                                    ▲
    │         RabbitMQ                   │
    └────────→ TrackPublished ───────────┘
               TrackUpdated    Event projector:
               TrackDeleted    consume → upsert/delete ES doc

Read routing:
  GET /search?q=...        → Elasticsearch (eventually consistent)
  GET /search/autocomplete → Elasticsearch
  GET /tracks/popular      → Redis cache → fallback PostgreSQL
  GET /tracks/{id}         → PostgreSQL (strong consistent)
  POST /tracks (response)  → PostgreSQL (just written)
```

### 6.4 Notification fan-out → MongoDB + WebSocket

```
events.user ──────→ UserFollowedEvent ──────┐
events.playlist ──→ PlaylistSharedEvent ────┤
events.playlist ──→ CollaboratorAdded ──────┤
events.playlist ──→ PlaylistTrackAdded ─────┤
events.catalog ───→ TrackPublished ─────────┤
events.upload ────→ TranscodeFailed ────────┘
                                             │
                                             ▼
                               Notification Service (TS)
                                             │
                               1. Check preferences (MongoDB)
                               2. Create notification (MongoDB)
                               │  - set expiresAt per type
                               │  - TTL index auto-deletes
                               3. Redis: INCR unread:{userId}
                               4. If user online:
                               │  → WebSocket push
                               5. If email enabled:
                                  → Nodemailer send
```

---

## 7. Saga Pattern chi tiết

### Upload Track Saga (Choreography-based)

**State machine:**

```
UPLOADING ──→ TRANSCODING ──→ PUBLISHING ──→ PUBLISHED
                  │                │
                  ▼                ▼
               FAILED           FAILED
            (compensate)     (compensate)
```

**Compensating actions:**

| Step failed | Compensation | Service |
|---|---|---|
| Transcode failed | Delete original + transcoded files từ MinIO, status=FAILED | Upload (Go) |
| Catalog reject | Delete transcoded files từ MinIO, status=FAILED | Upload (Go) |
| Search index failed | Retry (non-critical) hoặc manual re-index | Search (TS) |
| Neo4j sync failed | Retry (non-critical) — recommendation degraded nhưng không block | Recommend (Python) |

**Idempotency:** Mỗi event có `eventId` (UUID). Consumers check duplicate trước khi xử lý. Catalog kiểm tra `uploadJobId` unique.

---

## 8. CQRS Pattern chi tiết

### Áp dụng cho Catalog context

**Write model (PostgreSQL):** Normalized, ACID, source of truth. Chỉ Catalog Service truy cập.

**Read models:**
- **Elasticsearch:** Denormalized documents cho search (track + artist + album in 1 doc).
- **Redis:** Hot data cache (top tracks, new releases) — sub-ms.
- **Streaming track_cache:** Local PostgreSQL table sync từ events.
- **Neo4j nodes:** Track/Artist/Genre nodes sync từ events cho recommendation graph.

**Eventual consistency:** ES/Redis/Neo4j có thể delay 1-5 giây sau write. Accept vì read pattern (search, browse) tolerate stale data.

### Không áp CQRS cho services khác

User, Playlist, Upload: read/write ratio cân bằng, PostgreSQL queries đủ nhanh. Notification: MongoDB queries đủ nhanh (index on userId + createdAt).

---

## 9. Database migration strategy

| Ngôn ngữ | DB | Tool | Convention |
|---|---|---|---|
| Java | PostgreSQL | Flyway | `V1__create_users.sql`, `V2__add_index.sql` |
| Go | PostgreSQL | golang-migrate | `001_create_tables.up.sql` / `.down.sql` |
| Python | Neo4j | Cypher scripts | `001_constraints.cypher`, `002_indexes.cypher` |
| TypeScript | MongoDB | Mongoose schemas | Schema-driven (no migration files) |
| TypeScript | Elasticsearch | Index templates | `tracks-template.json` applied on startup |

**Nx integration:**

```bash
nx run user-service:migrate          # Flyway
nx run streaming-service:migrate     # golang-migrate
nx run recommend-service:migrate     # Cypher constraints
nx run-many --target=migrate --all   # All at once
```

---

## 10. Backup & disaster recovery

| Data store | Backup strategy | Recovery |
|---|---|---|
| PostgreSQL | `pg_dump` daily, WAL archiving | `pg_restore` or point-in-time recovery |
| Neo4j | `neo4j-admin dump` daily | `neo4j-admin load` — hoặc rebuild từ events |
| MongoDB | `mongodump` daily | `mongorestore` — hoặc replay events (notifications are ephemeral) |
| Elasticsearch | Snapshot to MinIO | Restore snapshot — hoặc rebuild hoàn toàn từ PostgreSQL events |
| Redis | RDB snapshots (optional) | Self-healing: services rebuild cache on miss |
| MinIO | Erasure coding + versioning | Critical — cần replication |
| RabbitMQ | Mirrored queues | Events replay nếu cần |

**Fault isolation (microservices advantage):**

| Scenario | Impact | Other services |
|---|---|---|
| Neo4j down | Recommendations unavailable | Streaming, Search, Auth vẫn hoạt động. Fallback: popular tracks. |
| MongoDB down | Notification history lost temporarily | Core features (play, search, playlist) không ảnh hưởng. |
| Elasticsearch down | Search unavailable | Browse by ID vẫn work (PostgreSQL). Upload, play vẫn work. |
| 1 PostgreSQL schema down | Chỉ service đó fail | Các service khác độc lập. |

---

## Tổng kết polyglot persistence

```
┌─────────────────────────────────────────────────────────────┐
│                    7 Data Stores                            │
│                                                             │
│  PostgreSQL (5)    │ Neo4j (1)    │ MongoDB (1)             │
│  ─────────────     │ ──────────   │ ───────────             │
│  User    (Java)    │ Recommend    │ Notification            │
│  Catalog (Java)    │ (Python)     │ (TypeScript)            │
│  Playlist(Java)    │              │                         │
│  Streaming (Go)    │ Graph        │ TTL, flexible           │
│  Upload   (Go)     │ traversal    │ schema                  │
│                    │ GDS algos    │                         │
│  ACID, relational  │ realtime     │ per-doc expiry          │
│                    │              │                         │
│  ─────────────────────────────────────────────────────────  │
│  Elasticsearch (1) │ Redis (multi) │ MinIO (2)  │ RabbitMQ  │
│  Search index      │ Cache layer   │ Audio/Img  │ Events    │
│  CQRS read model   │ Counters      │ S3 API     │ Async     │
│  Vietnamese NLP    │ Presence      │ Presigned  │ Saga      │
└─────────────────────────────────────────────────────────────┘

Mỗi loại DB được chọn vì workload cụ thể — không phải vì "muốn dùng nhiều DB".
```
