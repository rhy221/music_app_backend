# Infrastructure — Docker Containers

Tất cả data store chạy qua Docker Compose. File nằm tại `infra/docker-compose.yml`.

---

## Containers tổng quan

| Container | Image | Port(s) | Dùng bởi |
|-----------|-------|---------|----------|
| `music-postgres` | `postgres:16-alpine` | `5432` | User, Catalog, Playlist, Streaming, Upload |
| `music-neo4j` | `neo4j:5-community` | `7474`, `7687` | Recommend |
| `music-mongodb` | `mongo:7` | `27017` | Notification |
| `music-elasticsearch` | `elasticsearch:8.17.0` | `9200` | Search |
| `music-redis` | `redis:7-alpine` | `6379` | Multi-service |
| `music-minio` | `minio/minio:latest` | `9000`, `9001` | Upload, Streaming |
| `music-rabbitmq` | `rabbitmq:3.13-management-alpine` | `5672`, `15672` | All services |
| `music-minio-init` | `minio/mc:latest` | — | Init only |
| `music-rabbitmq-init` | `curlimages/curl:8` | — | Init only |

---

## Lệnh chạy

```bash
# Khởi động tất cả containers
cd infra
docker compose up -d

# Dừng tất cả (giữ data)
docker compose down

# Dừng và xóa toàn bộ data (reset sạch)
docker compose down -v

# Xem logs tất cả
docker compose logs -f

# Xem logs một service
docker compose logs -f rabbitmq

# Kiểm tra trạng thái health
docker compose ps
```

---

## Chi tiết từng container

---

### PostgreSQL 16

**Vai trò:** Source of truth cho 5 service (relational, ACID).

| | |
|--|--|
| **Image** | `postgres:16-alpine` |
| **Port** | `5432` |
| **User** | `music_admin` |
| **Password** | `music_pass` |

**Databases được tạo tự động khi start lần đầu:**

| Database | Service owner |
|----------|---------------|
| `user_db` | User Service (Java) |
| `catalog_db` | Catalog Service (Java) |
| `playlist_db` | Playlist Service (Java) |
| `streaming_db` | Streaming Service (Go) |
| `upload_db` | Upload Service (Go) |

**Connection strings:**

```
# user-service
postgresql://music_admin:music_pass@localhost:5432/user_db

# catalog-service
postgresql://music_admin:music_pass@localhost:5432/catalog_db

# playlist-service
postgresql://music_admin:music_pass@localhost:5432/playlist_db

# streaming-service
postgresql://music_admin:music_pass@localhost:5432/streaming_db

# upload-service
postgresql://music_admin:music_pass@localhost:5432/upload_db
```

**Kết nối bằng psql:**

```bash
docker exec -it music-postgres psql -U music_admin -d catalog_db
```

---

### Neo4j 5 Community

**Vai trò:** Graph database cho recommendation engine. Lưu quan hệ User→Track→Artist→Genre. Tích hợp GDS (Graph Data Science) cho collaborative filtering.

| | |
|--|--|
| **Image** | `neo4j:5-community` |
| **Browser UI** | `http://localhost:7474` |
| **Bolt** | `bolt://localhost:7687` |
| **User** | `neo4j` |
| **Password** | `music_pass` |
| **Plugin** | Graph Data Science (tự download khi start) |

**Connection string (Python neo4j driver):**

```
bolt://music_admin:music_pass@localhost:7687
```

> Neo4j GDS plugin được tải tự động khi container khởi động lần đầu — có thể mất 1-2 phút.

---

### MongoDB 7

**Vai trò:** Document DB cho Notification Service. Lưu notifications với TTL index (tự xóa theo loại: 7 ngày → 1 năm). Schema linh hoạt per notification type.

| | |
|--|--|
| **Image** | `mongo:7` |
| **Port** | `27017` |
| **User** | `music_admin` |
| **Password** | `music_pass` |
| **Database** | `notifications` |

**Connection string (Mongoose):**

```
mongodb://music_admin:music_pass@localhost:27017/notifications?authSource=admin
```

**Kết nối bằng mongosh:**

```bash
docker exec -it music-mongodb mongosh -u music_admin -p music_pass --authenticationDatabase admin notifications
```

---

### Elasticsearch 8

**Vai trò:** CQRS read model cho Catalog. Full-text search với Vietnamese analyzer (ICU plugin). Sync từ Catalog Service qua RabbitMQ events.

| | |
|--|--|
| **Image** | `elasticsearch:8.17.0` |
| **REST API** | `http://localhost:9200` |
| **Security** | Disabled (development) |

**Kiểm tra health:**

```bash
curl http://localhost:9200/_cluster/health?pretty
curl http://localhost:9200/_cat/indices?v
```

> **Lưu ý (Linux):** Elasticsearch yêu cầu `vm.max_map_count >= 262144`. Nếu container bị crash, chạy:
> ```bash
> sudo sysctl -w vm.max_map_count=262144
> ```
> Để persistent: thêm `vm.max_map_count=262144` vào `/etc/sysctl.conf`.

---

### Redis 7

**Vai trò:** In-memory cache multi-purpose cho nhiều service.

| | |
|--|--|
| **Image** | `redis:7-alpine` |
| **Port** | `6379` |
| **Password** | `music_pass` |
| **Max memory** | 256 MB (`allkeys-lru` eviction) |
| **Persistence** | AOF enabled |

**Use cases theo service:**

| Key pattern | TTL | Service |
|-------------|-----|---------|
| `session:{userId}` | 24h | User (JWT blacklist) |
| `cache:tracks:popular:{genre}` | 5m | Catalog |
| `cache:playlist:{id}` | 10m | Playlist |
| `track:{trackId}` | 1h | Streaming |
| `recs:{userId}` | 30m | Recommend |
| `online:{userId}` | 5m | Notification |
| `unread:{userId}` | — | Notification |
| `playcount:{trackId}` | — | Streaming |

**Kết nối:**

```bash
docker exec -it music-redis redis-cli -a music_pass

# Xem tất cả keys
KEYS *

# Monitor realtime
MONITOR
```

---

### MinIO (Object Storage)

**Vai trò:** S3-compatible object storage cho audio files, cover art, waveforms.

| | |
|--|--|
| **Image** | `minio/minio:latest` |
| **S3 API** | `http://localhost:9000` |
| **Web Console** | `http://localhost:9001` |
| **User** | `music_admin` |
| **Password** | `music_pass` |

**Buckets được tạo tự động:**

| Bucket | Nội dung | Quyền |
|--------|----------|-------|
| `audio-originals` | File gốc sau upload | Private |
| `audio-transcoded` | MP3/FLAC sau transcode | Private (presigned URL) |
| `images` | Cover art, avatars | Public download |
| `waveforms` | Waveform JSON data | Private |

**Truy cập Web Console:** `http://localhost:9001` → đăng nhập với `music_admin` / `music_pass`

---

### RabbitMQ 3.13

**Vai trò:** Event bus cho toàn bộ hệ thống. Choreography-based Saga cho upload workflow.

| | |
|--|--|
| **Image** | `rabbitmq:3.13-management-alpine` |
| **AMQP** | `amqp://localhost:5672` |
| **Management UI** | `http://localhost:15672` |
| **User** | `music_admin` |
| **Password** | `music_pass` |
| **VHost** | `music` |

**Exchanges được tạo tự động (type: topic, durable):**

| Exchange | Producer | Consumer chính |
|----------|----------|----------------|
| `events.upload` | Upload (Go) | Catalog (Java), Notification (TS) |
| `events.catalog` | Catalog (Java) | Search (TS), Streaming (Go), Playlist (Java), Neo4j |
| `events.streaming` | Streaming (Go) | Recommend (Python), Catalog (Java) |
| `events.user` | User (Java) | Notification (TS), Playlist (Java) |
| `events.playlist` | Playlist (Java) | Notification (TS) |

**Connection string:**

```
amqp://music_admin:music_pass@localhost:5672/music
```

**Truy cập Management UI:** `http://localhost:15672` → đăng nhập với `music_admin` / `music_pass`

---

## Cấu trúc files

```
infra/
├── docker-compose.yml
└── docker/
    ├── postgres/
    │   └── init.sql          # Tạo 5 databases khi start lần đầu
    └── rabbitmq/
        └── init.sh           # Tạo 5 topic exchanges sau khi broker sẵn sàng
```

---

## Thứ tự khởi động

Docker Compose tự động xử lý dependencies:

```
postgres, neo4j, mongodb, elasticsearch, redis
         ↓                               ↓
   (luôn start trước)              minio
                                        ↓
                                   minio-init  (sau khi minio healthy)
rabbitmq
    ↓
rabbitmq-init  (sau khi rabbitmq healthy)
```

---

## Credentials mặc định (development only)

| Service | Host | User | Password |
|---------|------|------|----------|
| PostgreSQL | `localhost:5432` | `music_admin` | `music_pass` |
| Neo4j | `localhost:7687` | `neo4j` | `music_pass` |
| MongoDB | `localhost:27017` | `music_admin` | `music_pass` |
| Elasticsearch | `localhost:9200` | — | — |
| Redis | `localhost:6379` | — | `music_pass` |
| MinIO | `localhost:9000` | `music_admin` | `music_pass` |
| RabbitMQ | `localhost:5672` | `music_admin` | `music_pass` |

> Không dùng các credentials này cho môi trường staging/production.
