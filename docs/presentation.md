# Music Streaming App — Microservices Architecture Presentation

## 1. Tổng quan hệ thống

Hệ thống streaming nhạc gồm **9 microservices** viết bằng **4 ngôn ngữ/framework** khác nhau (polyglot architecture), giao tiếp qua **event-driven messaging** (RabbitMQ) và **synchronous REST** (internal API), được orchestrate bằng **Docker Compose** và **Kubernetes (Helm Chart)**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Client (Web / Mobile)                                  │
└──────────────────────────────────┬──────────────────────────────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   KrakenD Gateway   │ :8080
                        │   (JWT, Rate Limit) │
                        └──────────┬──────────┘
          ┌────────────┬───────────┼───────────┬────────────┬───────────┐
          ▼            ▼           ▼           ▼            ▼           ▼
   ┌────────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
   │   User     ││ Catalog  ││ Playlist ││ Library  ││Streaming ││  Upload  │
   │  Service   ││ Service  ││ Service  ││ Service  ││ Service  ││ Service  │
   │ Spring Boot││Spr. Boot ││Spr. Boot ││Spr. Boot ││   Go     ││   Go     │
   │  :8081     ││  :8082   ││  :8083   ││  :8088   ││  :8084   ││  :8086   │
   └─────┬──────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
         │            │           │           │            │           │
         ▼            ▼           ▼           ▼            ▼           ▼
      RabbitMQ ◄──────────────────────────────────────────────────────►
         │
   ┌─────┼───────────────────┬──────────────────┐
   ▼     ▼                   ▼                  ▼
┌──────────┐          ┌────────────┐     ┌────────────┐
│  Search  │          │Notification│     │ Recommend  │
│ Service  │          │  Service   │     │  Service   │
│  NestJS  │          │   NestJS   │     │  FastAPI   │
│  :8085   │          │   :8087    │     │  :8000     │
└──────────┘          └────────────┘     └────────────┘
```

### Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| API Gateway | KrakenD (Go-based, high-performance) |
| Java Services (4) | Spring Boot 4.0, JPA/Hibernate, Spring AMQP |
| Go Services (2) | Chi router, pgx, go-common lib |
| TypeScript Services (2) | NestJS, TypeScript |
| Python Service (1) | FastAPI, aio-pika, neo4j-driver |
| Message Broker | RabbitMQ 3.13 (Topic Exchanges) |
| Databases | PostgreSQL 16, MongoDB 7, Neo4j 5, Elasticsearch 8.17 |
| Object Storage | MinIO (S3-compatible) |
| Cache | Redis 7 |
| Monitoring | Prometheus + Grafana + ELK Stack (Logstash + Elasticsearch + Kibana) |
| Container Orchestration | Docker Compose (dev) / Kubernetes + Helm (prod) |
| Monorepo Management | Nx |

---

## 2. Chi tiết từng Service

### 2.1 API Gateway (KrakenD) — Port 8080

**Vai trò:** Single entry point cho toàn bộ hệ thống.

**Tính năng:**
- **JWT Validation:** Xác thực token HS256, propagate claims (`sub` → `X-User-Id`, `role` → `X-User-Role`) xuống backend services
- **Rate Limiting:** IP-based, cấu hình riêng cho từng endpoint (VD: avatar upload 20 req/min, login 100 req/min)
- **RBAC:** Role-based authorization cho admin endpoints (`roles: ["ADMIN"]`)
- **CORS:** Cấu hình cross-origin cho frontend
- **Telemetry:** OpenTelemetry metrics export sang Prometheus
- **Logging:** Format logstash, gửi về ELK stack

**Ưu điểm:** KrakenD là stateless, cấu hình bằng JSON, hiệu năng cao (written in Go). Không cần code, chỉ cần config.

---

### 2.2 User Service (Spring Boot) — Port 8081

**Database:** PostgreSQL (`user_db`) + Redis (cache, refresh tokens)

**Domain entities:** User, Follow, OAuthAccount, RefreshToken, OutboxEvent

**Chức năng:**
- Đăng ký/đăng nhập (email + password, Google OAuth2)
- Quản lý profile, avatar upload (MinIO)
- Follow/unfollow users
- Change password, refresh token rotation
- Admin: quản lý users, update roles

**Events phát ra (qua Outbox Pattern):**
- `USER_REGISTERED` → Catalog, Recommend
- `USER_FOLLOWED` → Notification, Recommend
- `USER_PROFILE_UPDATED` → Catalog
- `USER_ROLE_UPDATED` → Catalog

**Architecture layers:** `web/` → `service/` → `repository/` → `domain/`

---

### 2.3 Catalog Service (Spring Boot) — Port 8082

**Database:** PostgreSQL (`catalog_db`) + Redis (cache)

**Domain entities:** Artist, Album, Track, AudioAsset, OutboxEvent, TrackStatus

**Chức năng:**
- CRUD Artist, Album, Track
- Nhận transcode result → publish track
- Đếm play count (batch flush từ Redis)
- Sync user profile data (denormalized Artist ← User)
- Internal APIs cho các services khác

**Events nhận vào:**
- `TRANSCODE_COMPLETED` từ Upload → tạo Track + publish
- `TRACK_PLAYED` từ Streaming → tăng play count
- `USER_REGISTERED` từ User → tạo Artist profile
- `USER_ROLE_UPDATED` từ User → cập nhật Artist
- `USER_PROFILE_UPDATED` từ User → sync tên/avatar
- `TRACK_DELETED` từ Upload → xóa track

**Events phát ra (qua Outbox Pattern):**
- `TRACK_PUBLISHED` → Search, Notification, Recommend
- `TRACK_UPDATED` → Search, Playlist
- `TRACK_DELETED` → Search, Playlist, Library

**Architecture layers:** `web/` → `service/` → `repository/` → `domain/`

---

### 2.4 Playlist Service (Spring Boot) — Port 8083

**Database:** PostgreSQL (`playlist_db`) + Redis (cache)

**Domain entities:** Playlist, PlaylistItem, Collaborator, CollaboratorRole, PlaylistVisibility, OutboxEvent

**Chức năng:**
- CRUD playlists (public/private/unlisted)
- Add/remove/reorder tracks
- Collaborative playlists (EDITOR/VIEWER roles)
- Gọi internal APIs: Catalog (validate track), User (validate user)

**Events nhận vào:**
- `TRACK_DELETED` từ Catalog → xóa track khỏi playlists
- `TRACK_UPDATED` từ Catalog → cập nhật metadata cached

**Events phát ra (qua Outbox Pattern):**
- `PLAYLIST_SHARED` → Notification
- `COLLABORATOR_ADDED` → Notification
- `PLAYLIST_TRACK_ADDED` → Notification

**Architecture layers:** `web/` → `service/` → `repository/` → `domain/`

---

### 2.5 Library Service (Spring Boot) — Port 8088

**Database:** PostgreSQL (`library_db`) + Redis (cache)

**Domain entities:** SavedTrack, SavedAlbum, FollowedPlaylist, OutboxEvent

**Chức năng:**
- Save/unsave tracks, albums
- Follow/unfollow playlists
- Reorder saved tracks
- Gọi internal APIs: Catalog, Playlist

**Events nhận vào:**
- `TRACK_DELETED` → xóa khỏi saved tracks
- `ALBUM_DELETED` → xóa khỏi saved albums
- `TRACK_UPDATED` → cập nhật cached metadata

---

### 2.6 Streaming Service (Go) — Port 8084

**Database:** PostgreSQL (`streaming_db`) + Redis (play counter, cache)

**Domain entities:** PlaySession, TrackCache, AssetURL, OutboxEvent, TrackPlayedPayload

**Chức năng:**
- Stream audio (byte-range requests từ MinIO)
- Quản lý play sessions (start/pause/resume/end)
- Lịch sử nghe, thống kê listening stats
- Cache track metadata từ Catalog (gọi REST internal)
- Đếm play count (Redis → batch publish)

**Events phát ra (qua Outbox Pattern):**
- `TRACK_PLAYED` → Catalog (play count), Recommend (graph)

**Clean Architecture:**
```
internal/
├── domain/          # Entities, ports (interfaces), value objects
│   ├── model.go     # PlaySession, TrackCache, OutboxEvent
│   ├── port.go      # CatalogClient, EventPublisher, PlayCounter, AudioStore
│   └── repository.go
├── usecase/         # Application logic
│   ├── session.go   # Start/end session
│   ├── stream.go    # Audio streaming
│   └── history.go   # Listening history
├── handler/         # HTTP handlers (presentation)
├── infrastructure/  # Adapters
│   ├── catalog/     # REST client → CatalogClient
│   ├── event/       # RabbitMQ publisher, outbox poller
│   ├── minio/       # Object storage → AudioStore
│   └── redis/       # Play counter → PlayCounter
└── repository/      # PostgreSQL repos
```

---

### 2.7 Upload Service (Go) — Port 8086

**Database:** PostgreSQL (`upload_db`)

**Domain entities:** UploadDraft, DraftTrack, UploadJob, TranscodeTask, OutboxEvent

**Chức năng:**
- Draft-based upload workflow (tạo draft → thêm tracks → upload audio lên MinIO → submit)
- Tạo presigned URL cho client upload trực tiếp lên MinIO
- Quản lý transcode jobs (fan-out to workers)
- Retry failed jobs

**Events phát ra (qua Outbox Pattern):**
- `TRACK_UPLOADED` → triggers transcoding pipeline
- `TRANSCODE_COMPLETED` → Catalog (publish track)
- `TRANSCODE_FAILED` → Notification (thông báo user)
- `TRACK_DELETED` → Catalog, Search, Playlist, Library

**Clean Architecture (Hexagonal):**
```
internal/
├── domain/          # Entities, errors, events (pure business logic)
│   ├── draft.go     # UploadDraft, DraftTrack + CanSubmit(), CanCancel()
│   ├── job.go       # UploadJob + CanRetry(), CanCancel()
│   ├── task.go      # TranscodeTask
│   ├── event.go     # OutboxEvent
│   └── errors.go    # Domain errors
├── port/            # Interfaces (driven ports)
│   ├── repository.go      # JobRepository, TaskRepository, OutboxRepository
│   ├── draft_repository.go
│   ├── storage.go         # FileStorage
│   ├── transactor.go      # Unit of Work pattern
│   └── dispatcher.go      # Async job dispatcher
├── usecase/         # Application services (one file per use case)
│   ├── create_draft.go
│   ├── add_track.go
│   ├── get_audio_upload_url.go
│   ├── confirm_audio.go
│   ├── submit_draft.go    # Core: creates jobs + outbox events atomically
│   ├── retry_job.go
│   ├── cancel_job.go
│   ├── cancel_draft.go
│   └── delete_track.go
└── adapter/         # Infrastructure adapters (driven adapters)
    ├── http/        # HTTP handlers (driving adapter)
    ├── postgres/    # DB repos implementing port interfaces
    └── minio/       # Object storage implementing FileStorage
```

---

### 2.8 Search Service (NestJS) — Port 8085

**Database:** Elasticsearch 8.17 (read model, CQRS)

**Domain documents:** TrackDocument, ArtistDocument, AlbumDocument

**Chức năng:**
- Full-text search: tracks, artists, albums
- Real-time index sync từ Catalog events
- Auto-create Elasticsearch indices on startup

**Events nhận vào:**
- `TRACK_PUBLISHED` → index track + upsert artist + album
- `TRACK_UPDATED` → partial update document
- `TRACK_DELETED` → delete document

**Architecture layers:**
```
src/app/
├── domain/              # Document types (ES schema)
├── application/         # SearchService (business logic)
├── infrastructure/
│   ├── elasticsearch/   # ES repositories, index initializer
│   └── messaging/       # RabbitMQ consumers
└── presentation/        # Controllers, DTOs
```

**CQRS:** Search Service là **read-side** thuần túy — nó không có write API, chỉ nhận events để cập nhật search index. Write operations xảy ra ở Catalog Service.

---

### 2.9 Notification Service (NestJS) — Port 8087

**Database:** MongoDB 7 + Redis (cache unread count)

**Domain entities:** Notification, NotificationPreference, NotificationType

**Chức năng:**
- In-app notifications + real-time push (Socket.IO)
- Email notifications (Nodemailer, cấu hình SMTP)
- Notification preferences per user
- Mark as read, pagination
- Gọi internal APIs: Catalog, User (enrich notification data)

**Events nhận vào (4 consumers):**
- `TRACK_PUBLISHED` → thông báo artist + fan-out followers ("New Release")
- `TRANSCODE_FAILED` → thông báo uploader lỗi
- `USER_FOLLOWED` → thông báo người được follow
- `PLAYLIST_SHARED` → thông báo người được share
- `COLLABORATOR_ADDED` → thông báo collaborator mới
- `PLAYLIST_TRACK_ADDED` → thông báo collaborators

**Architecture layers:** Tương tự Search Service (domain / application / infrastructure / presentation)

---

### 2.10 Recommend Service (FastAPI/Python) — Port 8000

**Database:** Neo4j 5 (graph DB) + Redis (cache recommendations)

**Domain entities:** TrackRec, TasteProfile, GenreWeight, ArtistWeight, FeedbackAction

**Chức năng:**
- Collaborative filtering recommendations (dựa trên graph similarity)
- Discover Weekly (personalized mix)
- Similar Tracks / Radio mode
- Popular tracks
- Taste Profile analysis (genre weights, top artists, profile strength)
- User feedback (like/dislike/skip/save)

**Events nhận vào (3 consumers):**
- `TRACK_PLAYED` từ Streaming → tạo/cập nhật edges User→Track trong graph
- `TRACK_PUBLISHED` từ Catalog → tạo node Track
- `USER_FOLLOWED` từ User → tạo edge User→User (FOLLOWS)

**Clean Architecture:**
```
recommend_service/
├── domain/
│   ├── entities.py      # TrackRec, TasteProfile (pure dataclasses)
│   └── ports.py         # IGraphRepository, ICacheService (Protocol interfaces)
├── application/
│   └── recommendation_service.py  # Business logic
├── infrastructure/
│   ├── neo4j_repository.py        # Implements IGraphRepository
│   ├── redis_service.py           # Implements ICacheService
│   ├── messaging/consumers.py     # RabbitMQ consumers
│   └── observability.py           # Prometheus metrics
├── presentation/
│   ├── routers/                   # FastAPI route handlers
│   └── schemas.py                 # Pydantic request/response models
└── container.py                   # Dependency injection
```

---

## 3. Shared Libraries (Monorepo)

Hệ thống dùng **Nx monorepo** với shared libraries cho mỗi ngôn ngữ:

| Library | Ngôn ngữ | Nội dung |
|---|---|---|
| `libs/java-common` | Java | JWT auth filter, base entity, pagination, error handling, RabbitMQ config, CORS, Actuator |
| `libs/go-common` | Go | JWT parser, PostgreSQL pool, Redis client, RabbitMQ connection/consumer/publisher, MinIO client, Prometheus metrics, graceful shutdown, health checks, Logstash writer |
| `libs/ts-common` | TypeScript | AuthGuard, RabbitMQ module, Redis module, Health module, Metrics module, Logging (Logstash transport), Exception filter |
| `libs/events/java` | Java | Event models + constants (exchanges, routing keys) cho Java services |
| `libs/events/typescript` | TypeScript | Event models + constants cho TS services |
| `libs/events/python` | Python | Event models + constants cho Python service |

**Shared Event Contract Library (`libs/events`)** là điểm quan trọng: định nghĩa chung tất cả event types, exchanges, routing keys để đảm bảo consistency giữa producer và consumer dù viết bằng ngôn ngữ khác nhau.

---

## 4. Database Architecture (Database-per-Service)

Mỗi service sở hữu database riêng, tuân thủ nguyên tắc **Database-per-Service**:

| Service | Database | Schema/DB | Lý do chọn |
|---|---|---|---|
| User Service | PostgreSQL 16 | `user_db` | Relational data, ACID transactions |
| Catalog Service | PostgreSQL 16 | `catalog_db` | Complex queries, joins (Artist↔Track↔Album) |
| Playlist Service | PostgreSQL 16 | `playlist_db` | Ordered collections, relational integrity |
| Library Service | PostgreSQL 16 | `library_db` | Simple CRUD, relational |
| Streaming Service | PostgreSQL 16 | `streaming_db` | Session tracking, history queries |
| Upload Service | PostgreSQL 16 | `upload_db` | Job tracking, transactional outbox |
| Search Service | Elasticsearch 8.17 | `tracks`, `artists`, `albums` indices | Full-text search, inverted index |
| Notification Service | MongoDB 7 | `notifications` | Flexible schema, high write throughput |
| Recommend Service | Neo4j 5 | Graph DB | Relationship traversal, graph algorithms |

**Redis 7** được dùng xuyên suốt làm cache layer (LRU eviction, 256MB, AOF persistence).

**MinIO** (S3-compatible) lưu trữ audio files và images (2 buckets: `audio`, `images`).

---

## 5. Event-Driven Architecture & Data Flow

### 5.1 Message Broker: RabbitMQ

Sử dụng **Topic Exchanges** với 5 exchanges tách biệt theo bounded context:

| Exchange | Owner Service | Events |
|---|---|---|
| `events.upload` | Upload Service | `TRACK_UPLOADED`, `TRANSCODE_COMPLETED`, `TRANSCODE_FAILED`, `TRACK_DELETED` |
| `events.catalog` | Catalog Service | `TRACK_PUBLISHED`, `TRACK_UPDATED`, `TRACK_DELETED` |
| `events.streaming` | Streaming Service | `TRACK_PLAYED` |
| `events.user` | User Service | `USER_REGISTERED`, `USER_FOLLOWED`, `USER_PROFILE_UPDATED`, `USER_ROLE_UPDATED` |
| `events.playlist` | Playlist Service | `PLAYLIST_SHARED`, `COLLABORATOR_ADDED`, `PLAYLIST_TRACK_ADDED` |

**Routing Keys** theo pattern `events.<entity>.<action>`, VD: `events.track.published`

**Dead Letter Exchange (DLX):** Mỗi queue có DLX riêng, messages lỗi được chuyển sang DLQ để troubleshoot thay vì mất.

### 5.2 Data Flow chính: Upload → Play

```
Artist uploads track:
1. Client → Gateway → Upload Service: tạo draft, upload audio lên MinIO (presigned URL)
2. Upload Service: submit draft → tạo UploadJob + OutboxEvent trong cùng 1 transaction
3. OutboxPoller publish → "TRACK_UPLOADED" event
4. Upload Service (worker): transcode audio (multiple bitrates)
5. Khi xong → "TRANSCODE_COMPLETED" event
6. Catalog Service nhận event → tạo Track + Artist record → publish "TRACK_PUBLISHED"
7. Song song:
   ├── Search Service: index track vào Elasticsearch
   ├── Recommend Service: tạo node Track trong Neo4j graph
   └── Notification Service: thông báo artist + fan-out "New Release" cho followers

User plays track:
1. Client → Gateway → Streaming Service: start session
2. Streaming Service: tạo PlaySession, fetch track metadata (cache/Catalog)
3. Client → Gateway → Streaming Service: stream audio (byte-range từ MinIO)
4. Khi session kết thúc → ghi OutboxEvent ("TRACK_PLAYED") trong cùng transaction
5. OutboxPoller publish → "TRACK_PLAYED" event
6. Song song:
   ├── Catalog Service: tăng play count (batch qua Redis)
   └── Recommend Service: cập nhật User→Track edge (PLAYED relationship)
```

### 5.3 Event Envelope Format

Tất cả events tuân theo cấu trúc chung:

```json
{
  "header": {
    "eventId": "uuid",
    "eventType": "TRACK_PUBLISHED",
    "timestamp": "ISO 8601",
    "sourceService": "catalog-service",
    "correlationId": "uuid (optional)"
  },
  "data": { ... }
}
```

---

## 6. Outbox Pattern

### Mô tả

Outbox Pattern đảm bảo **at-least-once delivery**: business state change và event được ghi vào cùng 1 database transaction. Một **OutboxPoller** chạy background (mỗi 5 giây) đọc các events chưa publish và gửi lên RabbitMQ.

### Triển khai

| Service | Ngôn ngữ | Cách triển khai |
|---|---|---|
| User Service | Java | `OutboxEvent` entity (JPA) + `OutboxProcessor` (`@Scheduled(fixedDelay=5000)`) |
| Catalog Service | Java | Tương tự User Service |
| Playlist Service | Java | Tương tự User Service |
| Library Service | Java | Tương tự User Service |
| Streaming Service | Go | `OutboxPoller` goroutine, `OutboxRepository` interface, retry count tracking |
| Upload Service | Go | `OutboxRepository` port + `Transactor` (Unit of Work) cho atomic insert |

**OutboxEvent schema (chung):**

```
outbox_events
├── id           UUID (PK)
├── event_type   VARCHAR (e.g., "TRACK_PLAYED")
├── exchange     VARCHAR (e.g., "events.streaming")
├── routing_key  VARCHAR (e.g., "events.track.played")
├── payload      TEXT (JSON)
├── published    BOOLEAN (hoặc processed_at TIMESTAMP)
├── created_at   TIMESTAMP
└── retry_count  INT (Go services)
```

### Flow

```
1. Business logic + outbox event INSERT → cùng DB transaction (COMMIT)
2. OutboxPoller (mỗi 5s) → SELECT WHERE published = false LIMIT 50-100
3. Cho mỗi event → publish lên RabbitMQ
4. Nếu thành công → UPDATE published = true
5. Nếu thất bại → log error, retry lần sau (at-least-once)
```

### Services KHÔNG dùng Outbox

- **Search Service, Notification Service, Recommend Service** — đây là **event consumers thuần túy**, không publish events ra ngoài, nên không cần outbox.

---

## 7. Saga Pattern (Choreography-based)

Hệ thống sử dụng **Choreography Saga** (không có orchestrator trung tâm) — mỗi service lắng nghe events và thực hiện bước tiếp theo.

### Saga: Track Upload Pipeline

```
Upload Service          Catalog Service         Search / Notification / Recommend
     │                       │                           │
     │ TRACK_UPLOADED         │                           │
     │──────────┐             │                           │
     │ (self)   │ transcode   │                           │
     │◄─────────┘             │                           │
     │                        │                           │
     │ TRANSCODE_COMPLETED    │                           │
     │───────────────────────►│                           │
     │                        │ create Track              │
     │                        │ TRACK_PUBLISHED           │
     │                        │──────────────────────────►│
     │                        │                           │ index / notify / graph
     │                        │                           │
     │ TRANSCODE_FAILED       │                           │
     │───────────────────────►│ (không tạo Track)         │
     │                        │                           │
     │──────────────────────────────────────────────────►│
     │           Notification: thông báo upload failed    │
```

### Compensation (Saga rollback)

Khi track bị xóa, compensation events cascade:

```
Upload Service: TRACK_DELETED
    ├── Catalog Service: xóa Track record → publish TRACK_DELETED (catalog exchange)
    │   ├── Search Service: xóa document Elasticsearch
    │   ├── Playlist Service: xóa track khỏi tất cả playlists
    │   └── Library Service: xóa khỏi saved tracks
    └── Notification: (nếu cần)
```

**Lưu ý:** Đây là choreography saga, không phải orchestration. Ưu điểm: đơn giản, loosely coupled. Nhược điểm: khó debug khi flow phức tạp, thiếu central visibility.

---

## 8. Kỹ thuật Microservices đã triển khai

| Kỹ thuật | Có/Không | Chi tiết |
|---|---|---|
| **API Gateway** | ✅ | KrakenD — routing, JWT auth, rate limiting, CORS |
| **Database per Service** | ✅ | 6 PostgreSQL DBs + MongoDB + Elasticsearch + Neo4j |
| **Event-Driven Architecture** | ✅ | RabbitMQ Topic Exchanges, async communication |
| **Outbox Pattern** | ✅ | 6/9 services (tất cả event producers) |
| **CQRS** | ✅ | Search Service = read model (Elasticsearch), Catalog = write model |
| **Saga (Choreography)** | ✅ | Upload pipeline, track deletion cascade |
| **Shared Event Contracts** | ✅ | `libs/events/` — polyglot event definitions (Java/TS/Python) |
| **Shared Libraries** | ✅ | `libs/java-common`, `go-common`, `ts-common` |
| **Circuit Breaker + Retry** | ✅ | Xem mục 8.1 chi tiết — triển khai ở 4/9 services |
| **Dead Letter Queue (DLQ)** | ✅ | Tất cả queues có DLX/DLQ |
| **Rate Limiting** | ✅ | Per-endpoint tại Gateway |
| **JWT Authentication** | ✅ | Gateway validates, propagate claims qua headers |
| **RBAC** | ✅ | Role-based (USER/ARTIST/ADMIN) |
| **Health Checks** | ✅ | Tất cả services expose health endpoints |
| **Centralized Logging** | ✅ | ELK Stack (Logstash ← TCP/UDP/GELF → Elasticsearch → Grafana) |
| **Metrics & Monitoring** | ✅ | Prometheus scraping tất cả services + Grafana dashboards |
| **Containerization** | ✅ | Docker (mỗi service có Dockerfile) |
| **Container Orchestration** | ✅ | Kubernetes Helm Chart |
| **Object Storage** | ✅ | MinIO (presigned URLs, byte-range streaming) |
| **Polyglot Architecture** | ✅ | 4 ngôn ngữ: Java, Go, TypeScript, Python |
| **Monorepo** | ✅ | Nx workspace |

---

## 8.1 Circuit Breaker & Resilience Patterns — Chi tiết

Circuit Breaker được triển khai ở **tất cả services có synchronous inter-service calls** (4/9 services), dùng 3 thư viện khác nhau tương ứng 3 ngôn ngữ:

### Spring Boot services — Resilience4j

**Playlist Service** và **Library Service** dùng `resilience4j-spring-boot3` với annotation-based approach:

```java
// Playlist Service → gọi Catalog Service
@CircuitBreaker(name = "catalogService", fallbackMethod = "getTrackFallback")
@Retry(name = "catalogService")
public InternalTrackDto getTrack(UUID trackId) { ... }

// Playlist Service → gọi User Service
@CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
@Retry(name = "userService")
public InternalUserDto getUser(UUID userId) { ... }

// Library Service → gọi Catalog Service
@CircuitBreaker(name = "catalogService", fallbackMethod = "fallback")
@Retry(name = "catalogService")
public InternalTrackDto getTrack(UUID trackId) { ... }

// Library Service → gọi Playlist Service
@CircuitBreaker(name = "playlistService", fallbackMethod = "fallback")
@Retry(name = "playlistService")
public InternalPlaylistDto getPlaylist(UUID playlistId) { ... }
```

Cấu hình Resilience4j (trong `application.yml`):
```yaml
resilience4j:
  circuitbreaker:
    configs:
      default:
        sliding-window-type: COUNT_BASED
        sliding-window-size: 10           # đánh giá trên 10 calls gần nhất
        failure-rate-threshold: 50        # mở circuit khi ≥50% fail
        wait-duration-in-open-state: 30s  # chờ 30s trước khi thử lại
        permitted-number-of-calls-in-half-open-state: 3
        minimum-number-of-calls: 5        # cần tối thiểu 5 calls mới đánh giá
        record-exceptions:
          - org.springframework.web.client.ResourceAccessException
        ignore-exceptions:
          - jakarta.persistence.EntityNotFoundException  # 404 không phải lỗi circuit
```

**Fallback strategy:** Throw `ServiceUnavailableException` (503) — cho client biết downstream service đang unavailable thay vì trả lỗi vô nghĩa.

### Go (Streaming Service) — sony/gobreaker

```go
// Streaming Service → gọi Catalog Service
cbSettings := gobreaker.Settings{
    Name:        "catalog-service",
    MaxRequests: 3,                    // cho phép 3 requests trong half-open
    Interval:    10 * time.Second,     // reset counters mỗi 10s
    Timeout:     30 * time.Second,     // chờ 30s trước khi half-open
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        return counts.ConsecutiveFailures >= 5  // mở circuit sau 5 failures liên tiếp
    },
    IsSuccessful: func(err error) bool {
        return err == nil || errors.Is(err, domain.ErrNotFound)  // 404 = success
    },
}
```

Kết hợp **retry with exponential backoff** (3 attempts, 500ms → 1s → 2s) bên trong circuit breaker.

### TypeScript (Notification Service) — cockatiel

```typescript
// Notification Service → gọi Catalog Service, User Service
const retryPolicy = retry(handleAll, {
    maxAttempts: 2,
    backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 2000 }),
});
const cb = circuitBreaker(handleAll, {
    halfOpenAfter: 30_000,                    // 30s
    breaker: new ConsecutiveBreaker(5),        // 5 consecutive failures
});
return { policy: wrap(retryPolicy, cb) };     // retry bên trong circuit breaker
```

### Tổng hợp Circuit Breaker

| Service | Gọi đến | Library | Strategy |
|---|---|---|---|
| **Playlist Service** | Catalog, User | Resilience4j | CB + Retry, fallback → 503 |
| **Library Service** | Catalog, Playlist | Resilience4j | CB + Retry, fallback → 503 |
| **Streaming Service** | Catalog | gobreaker v2 | CB + Retry (exponential backoff) |
| **Notification Service** | Catalog, User | cockatiel | CB + Retry (exponential backoff), graceful degradation (log & skip) |

**Services KHÔNG cần Circuit Breaker:** User, Catalog, Upload, Search, Recommend — vì chúng không gọi synchronous REST đến service khác (hoặc chỉ nhận events qua RabbitMQ).

### Resilience bổ sung

- **RabbitMQ auto-reconnect:** `go-common/rabbitmq` có background goroutine monitor connection và tự reconnect khi bị drop
- **Message retry + DLQ:** Tất cả consumers (Go, NestJS, Python) đều track retry count trong message headers, reject vào Dead Letter Queue khi vượt max retries (3 lần)
- **HTTP timeouts:** Tất cả REST clients đều cấu hình connect timeout (2s) + read timeout (5s) để tránh hanging connections

---

## 9. Clean Architecture Analysis

### Đánh giá theo service

#### ✅ Full Clean Architecture (Ports & Adapters / Hexagonal)

**Upload Service (Go)** — triển khai Clean Architecture đầy đủ nhất trong hệ thống:

```
internal/
├── domain/          # Pure business entities — KHÔNG import bất kỳ package nào ngoài stdlib
│   ├── draft.go     # UploadDraft + CanSubmit(), CanCancel() business rules
│   ├── job.go       # UploadJob + CanRetry(), CanCancel()
│   ├── event.go     # OutboxEvent
│   └── errors.go    # Domain errors (ErrConflict, ErrValidation, ...)
├── port/            # Interfaces (driven ports) — domain KHÔNG biết implementation
│   ├── repository.go      # JobRepository, TaskRepository, OutboxRepository
│   ├── draft_repository.go # DraftRepository
│   ├── storage.go         # FileStorage (MinIO abstracted away)
│   ├── transactor.go      # Transactor (Unit of Work — DB transaction abstraction)
│   └── dispatcher.go      # Dispatcher (async job dispatch abstraction)
├── usecase/         # Application services — depend on port interfaces, NOT adapters
│   └── (one file per use case: create_draft, submit_draft, retry_job, ...)
└── adapter/         # Infrastructure implementations (driven adapters)
    ├── http/        # HTTP handlers — driving adapter
    ├── postgres/    # Implements JobRepository, OutboxRepository, DraftRepository, Transactor
    └── minio/       # Implements FileStorage
```

**Dependency rule tuân thủ hoàn toàn:** `domain/` → không import gì | `port/` → chỉ import `domain/` | `usecase/` → chỉ import `domain/` + `port/` | `adapter/` → import tất cả + external libraries (pgx, minio SDK, ...). Usecase nhận port interfaces qua constructor injection.

---

**Streaming Service (Go)** — cũng Clean Architecture đầy đủ, cấu trúc hơi khác:

```
internal/
├── domain/          # Entities + port interfaces trong cùng package
│   ├── model.go     # PlaySession, TrackCache, OutboxEvent, TrackPlayedPayload
│   ├── port.go      # CatalogClient, EventPublisher, PlayCounter, AudioStore
│   └── repository.go # SessionRepository, TrackCacheRepository, OutboxRepository
├── usecase/         # session.go, stream.go, history.go
├── handler/         # HTTP handlers
├── infrastructure/  # Adapters
│   ├── catalog/     # HTTPCatalogClient implements domain.CatalogClient
│   ├── event/       # RabbitMQ publisher + OutboxPoller
│   ├── minio/       # AudioStore implementation
│   └── redis/       # PlayCounter implementation
└── repository/      # PostgreSQL implementations
```

Port interfaces được định nghĩa trong `domain/` package (thay vì package `port/` riêng), nhưng dependency rule vẫn đúng: usecase chỉ depend on domain interfaces, infrastructure implement chúng.

---

**Recommend Service (Python/FastAPI)** — Clean Architecture với Python Protocol (structural typing):

```
recommend_service/
├── domain/
│   ├── entities.py  # TrackRec, TasteProfile, GenreWeight (pure dataclasses)
│   └── ports.py     # IGraphRepository, ICacheService — Python Protocol interfaces
├── application/
│   └── recommendation_service.py  # Business logic, depend on ports
├── infrastructure/
│   ├── neo4j_repository.py    # Implements IGraphRepository (structural match)
│   ├── redis_service.py       # Implements ICacheService
│   └── messaging/consumers.py # RabbitMQ consumers
├── presentation/
│   ├── routers/               # FastAPI route handlers
│   └── schemas.py             # Pydantic request/response models
└── container.py               # Manual DI wiring
```

Python không có interface keyword, nhưng `Protocol` (PEP 544) đạt được structural typing tương đương. Domain hoàn toàn independent — chỉ dùng stdlib `dataclasses` và `typing`.

---

**Search Service (NestJS)** — Clean Architecture layered:

```
src/app/
├── domain/              # Document types (Elasticsearch schema)
├── application/         # SearchService (business logic)
├── infrastructure/
│   ├── elasticsearch/   # ES repositories, index initializer
│   └── messaging/       # RabbitMQ consumers
└── presentation/        # Controllers, DTOs
```

4 layers tách biệt rõ ràng. Tuy nhiên domain layer mỏng (chỉ là document types) vì bản chất service này là **CQRS read-side** — business logic chủ yếu là mapping events → ES documents.

---

**Notification Service (NestJS)** — Tương tự Search Service:

```
src/app/
├── domain/              # Entity, enums
├── application/         # NotificationService, PreferenceService, RealtimeService
├── infrastructure/
│   ├── persistence/     # MongoDB repositories
│   ├── messaging/       # 4 RabbitMQ consumers
│   ├── http/            # REST clients (Catalog, User) + resilience policies
│   ├── cache/           # Redis unread count cache
│   └── email/           # Nodemailer service
└── presentation/        # Controllers, DTOs
```

Infrastructure layer phong phú nhất: persistence, messaging, http clients, cache, email — tất cả tách biệt khỏi application logic.

---

#### ⚠️ Layered Architecture (không phải Clean Architecture)

**User Service, Catalog Service, Playlist Service, Library Service** (tất cả Spring Boot):

```
com.musicapp.{service}/
├── domain/       # JPA entities (@Entity, @Table, @Column)
├── dto/          # Request/Response DTOs + mappers
├── repository/   # Spring Data JPA interfaces (extends JpaRepository<Entity, UUID>)
├── service/      # Business logic
├── messaging/    # RabbitMQ consumers + OutboxProcessor
├── config/       # Spring configurations
└── web/          # REST controllers
```

**Tại sao không phải Clean Architecture?**

| Tiêu chí | Clean Architecture | Spring Boot services hiện tại |
|---|---|---|
| Domain independence | Domain không import infrastructure | Domain entities dùng `@Entity`, `@Table`, `@Column` (JPA annotations) → **phụ thuộc Jakarta Persistence API** |
| Port interfaces | Use cases depend on abstract interfaces | Service gọi thẳng `JpaRepository<Entity, UUID>` — **không có port abstraction** |
| Dependency direction | Infrastructure → Domain | Repository interface bị ràng buộc bởi entity type (`JpaRepository<User, UUID>`) → **domain shape dictated by ORM** |

**Lý do trade-off:**

1. **Đặc thù Spring Boot + JPA:** Framework thiết kế theo convention: entity = JPA entity, repository = Spring Data interface. Để tách thành pure domain + port + adapter cần tạo: domain model riêng + JPA entity riêng + mapper + port interface + adapter class → **gấp đôi boilerplate** cho mỗi entity.

2. **CRUD-heavy services:** User, Catalog, Playlist, Library chủ yếu là CRUD operations. Business logic không đủ phức tạp để justify overhead của Clean Architecture. So sánh: Upload Service có workflow phức tạp (draft → submit → transcode → publish → retry/cancel) nên Clean Architecture mang lại giá trị rõ ràng.

3. **Spring Data JPA trade-off:** `JpaRepository<T, ID>` cho miễn phí: pagination, sorting, query derivation, auditing. Nếu wrap sau port interface sẽ mất các tính năng này hoặc phải re-expose chúng.

4. **Không phải anti-pattern:** Layered architecture (Controller → Service → Repository → Domain) vẫn có separation of concerns rõ ràng, vẫn testable. Chỉ là dependency arrows không strictly inward như Clean Architecture yêu cầu.

**Kết luận:**
- **5/9 services triển khai Clean Architecture** (2 Go, 2 NestJS, 1 Python) — với port interfaces, dependency inversion, domain independence.
- **4/9 services dùng Layered Architecture** (Spring Boot) — trade-off có chủ đích giữa architectural purity và framework productivity cho CRUD-heavy services.
- Đáng chú ý: các services có business logic phức tạp nhất (Upload, Streaming) đều dùng Clean Architecture; các services CRUD-heavy dùng layered — đây là **quyết định thiết kế hợp lý** dựa trên complexity của từng bounded context.

---

## 10. Observability Stack

### 10.1 Metrics (Prometheus + Grafana)

- **Prometheus** scrape metrics từ tất cả 9 services + gateway mỗi 15s
- Spring Boot: `/actuator/prometheus` (Micrometer)
- Go: `/metrics` (prometheus/client_golang)
- NestJS: `/metrics` (custom MetricsService)
- FastAPI: `/metrics` (prometheus-client)
- **Grafana** visualize với pre-provisioned dashboard ("Services Overview")

### 10.2 Logging (ELK Stack)

```
Services ──(TCP/UDP JSON)──► Logstash ──► Elasticsearch ──► Grafana (Logs panel)
Gateway  ──(GELF/Docker)──► Logstash ──►                    (hoặc Kibana)
```

- Logstash nhận logs qua 3 inputs: TCP :5044, UDP :5044, GELF :12201
- Parse timestamp, normalize log level, route vào index `logstash-YYYY.MM.dd`
- Grafana datasource Elasticsearch-Logs cho log exploration

### 10.3 Tracing

- KrakenD Gateway cấu hình OpenTelemetry (trace_sample_rate: 5%)
- K8s deployment bao gồm **Jaeger** cho distributed tracing

---

## 11. Deployment

### Docker Compose (Development)

- 9 application services + 7 infrastructure containers + 4 monitoring containers + 3 init containers = **~23 containers**
- Tất cả trong 1 network `music-app-network`
- Health checks cho mọi service, `depends_on` với `condition`
- Volumes persistent cho data

### Kubernetes (Production)

- **Helm Chart** (`k8s/music-app/`)
- Mỗi service có riêng: Deployment, Service, ConfigMap
- Infrastructure: StatefulSets (Postgres, MongoDB, Neo4j, Elasticsearch, Redis, RabbitMQ, MinIO)
- Monitoring: Prometheus, Grafana, Logstash, Kibana, Jaeger
- Ingress controller cho external access
- Secrets management
- Namespace isolation

---

## 12. Khuyết điểm & Hạn chế

### 12.1 Service Discovery — Platform-level (không phải khuyết điểm)

Hệ thống sử dụng **DNS-based service discovery** tích hợp sẵn trong platform:

- **Docker Compose:** Container name (`music-catalog-service`) được resolve qua Docker embedded DNS trong cùng network `music-app-network`
- **Kubernetes:** Service name resolve qua CoreDNS (`catalog-service.music-app.svc.cluster.local`), kèm load balancing tự động qua ClusterIP

Đây **không phải khuyết điểm** — các giải pháp như Consul, Eureka ra đời cho VM/bare-metal environments chưa có built-in DNS service discovery. Khi đã chạy trên K8s, thêm Consul/Eureka là **anti-pattern** (thêm component phải maintain mà platform đã cung cấp sẵn). Hệ thống hiện tại đang làm đúng.

### 12.2 Thiếu Distributed Tracing end-to-end

**Vấn đề:** Gateway có OpenTelemetry, nhưng các backend services chưa propagate trace context qua RabbitMQ messages. `correlationId` trong event header là optional và chưa được tận dụng đầy đủ.

**Lý do:** ELK stack đã cover log aggregation. Tracing qua async events (RabbitMQ) phức tạp hơn HTTP tracing đáng kể.

### 12.3 Circuit Breaker Fallback — phân tích theo từng call site

Circuit Breaker đã triển khai đầy đủ ở 4/9 services (xem mục 8.1). Fallback strategy khác nhau tùy context:

| Service → Target | Mục đích gọi | Fallback hiện tại | Đánh giá |
|---|---|---|---|
| **Playlist** → Catalog | Validate track tồn tại trước khi add | 503 ServiceUnavailable | ✅ **Đúng** — không thể add track không verify được |
| **Playlist** → User | Validate user trước khi add collaborator | 503 ServiceUnavailable | ✅ **Đúng** — lý do tương tự |
| **Library** → Catalog | Enrich track/album metadata | 503 ServiceUnavailable | ⚠️ Có thể trả basic saved data không enrich, nhưng UX chênh lệch nhỏ |
| **Library** → Playlist | Validate playlist trước khi follow | 503 ServiceUnavailable | ✅ **Đúng** — data integrity |
| **Streaming** → Catalog | Fetch track asset URLs để stream | Check local `TrackCacheRepository` trước, gọi Catalog khi cache miss | ✅ **Đã có fallback tốt** — cache-first strategy |
| **Notification** → User | Fetch followers cho fan-out | Catch error → return `[]` → skip fan-out, log warning | ✅ **Graceful degradation** |
| **Notification** → Catalog | Fetch artist info | Catch error → return `null` → skip notification | ✅ **Graceful degradation** |

**Kết luận:** 5/7 call sites đã có fallback strategy hợp lý (hoặc fail-fast đúng ngữ cảnh, hoặc graceful degradation). Streaming Service có cache-first pattern tốt nhất. Notification Service xử lý graceful (skip thay vì crash). Các validation calls (Playlist, Library) trả 503 là đúng vì không nên cho phép operation trên data chưa verify.

### 12.4 Outbox Polling thay vì CDC

**Vấn đề:** Outbox dùng polling (mỗi 5 giây) thay vì Change Data Capture (Debezium). Tạo delay 0-5s cho mỗi event và tạo load lên database.

**Lý do:** Polling đơn giản hơn nhiều so với setup Debezium + Kafka Connect. Với traffic hiện tại, 5s delay chấp nhận được.

### 12.5 Choreography Saga khó debug

**Vấn đề:** Không có central saga coordinator → khó trace flow xuyên suốt khi có lỗi. Phải đọc logs của nhiều services để hiểu chain of events.

**Lý do:** Choreography đơn giản hơn orchestration cho số lượng steps ít (2-3 services). Orchestration saga cần thêm 1 service coordinator + state machine.

### 12.6 Không có API Versioning Strategy

**Vấn đề:** APIs đều là `/api/v1/...` nhưng chưa có kế hoạch backward-compatible evolution khi cần breaking changes.

### 12.7 Auto-scaling — đã triển khai (không phải khuyết điểm)

HPA (Horizontal Pod Autoscaler) đã được cấu hình cho **tất cả 10 services** trong `k8s/music-app/templates/services/hpa.yaml`, dùng Helm template loop tự động generate HPA cho mỗi service khi `autoscaling.enabled: true`.

| Service | Min → Max Replicas | CPU Target | Memory Target |
|---|---|---|---|
| Gateway, User, Catalog, Playlist, Library, Search, Upload, Notification, Recommend | 1 → 3 | 70% | 80% |
| **Streaming Service** | 1 → **5** | **60%** | **75%** | 

Streaming Service được cấu hình scale nhiều hơn (max 5, threshold thấp hơn) vì đây là service chịu tải cao nhất (audio streaming, byte-range requests liên tục).

### 12.8 Spring Boot services thiếu Clean Architecture boundary

**Như phân tích ở mục 9:** Domain entities phụ thuộc JPA annotations. Tuy nhiên đây là trade-off có chủ đích giữa purity và productivity cho CRUD-heavy services.

---

## 13. Tóm tắt Kiến trúc (cho Slide tổng kết)

| Aspect | Approach |
|---|---|
| **Architecture Style** | Microservices, Event-Driven, Polyglot |
| **Communication** | Async (RabbitMQ) + Sync (REST internal APIs) |
| **Data Consistency** | Eventual Consistency (Outbox Pattern + Choreography Saga) |
| **Search** | CQRS — write to PostgreSQL, query from Elasticsearch |
| **Recommendation** | Graph-based (Neo4j) + Collaborative Filtering |
| **Auth** | JWT (HS256) tại Gateway, propagate via headers |
| **Resilience** | Circuit Breaker + Retry (4 services, 3 libraries), DLQ, auto-reconnect |
| **Observability** | Prometheus + Grafana (metrics), ELK (logs), Jaeger (traces) |
| **Deployment** | Docker Compose (dev), Kubernetes + Helm (prod) |
| **Code Organization** | Nx Monorepo, shared event contracts + common libraries |
