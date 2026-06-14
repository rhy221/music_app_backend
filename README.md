# Music App — Monorepo

Ứng dụng streaming nhạc, kiến trúc microservices polyglot. Workspace quản lý bằng [Nx](https://nx.dev), package manager là **pnpm**.

---

## Tổng quan kiến trúc

| Service | Stack | Port |
|---|---|---|
| **Gateway** | KrakenD | `8080` |
| **user-service** | Java 26 / Spring Boot 4 | `8081` |
| **catalog-service** | Java 26 / Spring Boot 4 | `8082` |
| **playlist-service** | Java 26 / Spring Boot 4 | `8083` |
| **streaming-service** | Go 1.22 | `8084` |
| **search-service** | TypeScript / NestJS 11 | `8085` |
| **upload-service** | Go 1.22 | `8086` |
| **notification-service** | TypeScript / NestJS 11 | `8087` |
| **recommend-service** | Python 3.10+ / FastAPI | `8000` |
| **Frontend** | Next.js 16 / React 19 | `3000` |

---

## Prerequisites

| Tool | Version | Cài đặt |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Java JDK | 26 | [adoptium.net](https://adoptium.net) |
| Python | ≥ 3.10, < 3.13 | [python.org](https://python.org) |
| Poetry | ≥ 1.8 | `pip install poetry` |
| Go | ≥ 1.22 | [go.dev](https://go.dev) |
| Docker + Compose | Latest | [docker.com](https://docker.com) |

---

## 1. Khởi động Infrastructure

Tất cả dependencies (databases, message broker, object storage) chạy qua Docker Compose.

```bash
cd infra
docker compose up -d
```

Lần đầu sẽ pull images và khởi tạo tự động:
- PostgreSQL: tạo 5 databases (user_db, catalog_db, playlist_db, streaming_db, upload_db)
- MinIO: tạo buckets `images` và `audio`
- RabbitMQ: tạo topic exchanges

Kiểm tra trạng thái:

```bash
docker compose ps
```

### Admin UIs

| Service | URL | Credentials |
|---|---|---|
| RabbitMQ Management | http://localhost:15672 | `music_admin` / `music_pass` |
| MinIO Console | http://localhost:9001 | `music_admin` / `music_pass` |
| Neo4j Browser | http://localhost:7474 | `neo4j` / `music_pass` |
| Elasticsearch | http://localhost:9200 | — (no auth) |

---

## 2. Cấu hình Environment Variables

Mỗi service đọc config từ biến môi trường. Các file `.env.example` đã được commit vào git làm template — **không chứa secret thật**.

### Bước 1 — Copy template

```bash
# Root (Java services: user, catalog, playlist + shared infra)
cp .env.example .env

# Go services (dùng connection string thay vì biến riêng lẻ)
cp services/upload-service/.env.example    services/upload-service/.env
cp services/streaming-service/.env.example services/streaming-service/.env

# Python service
cp services/recommend-service/.env.example services/recommend-service/.env

# Frontend (Next.js)
cp frontend/app-frontend/.env.local.example frontend/app-frontend/.env.local
```

### Bước 2 — Đặt JWT_SECRET

`JWT_SECRET` **phải giống nhau** ở tất cả services. Sinh giá trị ngẫu nhiên:

```bash
openssl rand -base64 32
```

Thay thế giá trị `change-me-in-production-min-32-chars` trong **tất cả** các file `.env` vừa tạo.

### Bước 3 — Điền các secret còn lại (production)

| Biến | Service | Mô tả |
|---|---|---|
| `SMTP_USER`, `SMTP_PASS` | notification-service | Credentials SMTP để gửi email |
| `GOOGLE_TOKEN_INFO_URL` | user-service | Endpoint verify Google OAuth2 token |
| `ELASTICSEARCH_USERNAME/PASSWORD` | search-service | Nếu Elasticsearch bật xác thực |
| `NEO4J_PASSWORD` | recommend-service | Mật khẩu Neo4j |

> Với local dev, giá trị mặc định trong `.env.example` hoạt động được ngay với infrastructure từ Docker Compose.

---

## 3. Cài đặt dependencies (lần đầu sau khi clone)

```bash
# Node.js dependencies cho toàn workspace (NestJS services + frontend)
pnpm install

# Python dependencies cho recommend-service
cd services/recommend-service && poetry install && cd ../..
```

> Java (Gradle) và Go không cần bước install thủ công.  
> Gradle tự tải dependencies khi build; Go dùng `go.work` workspace ở root.

---

## 4. Chạy Backend Services

### Chạy từng service riêng lẻ

```bash
# Java services (Spring Boot)
pnpm nx run user-service:serve          # port 8081
pnpm nx run catalog-service:serve       # port 8082
pnpm nx run playlist-service:serve      # port 8083

# Go services
pnpm nx run streaming-service:serve     # port 8084
pnpm nx run upload-service:serve        # port 8086

# TypeScript / NestJS services
pnpm nx run search-service:serve        # port 8085
pnpm nx run notification-service:serve  # port 8087

# Python service
pnpm nx run recommend-service:serve     # port 8000
```

> **gateway** chạy qua Docker Compose ở http://localhost:8080. KrakenD dùng `host.docker.internal` để reach các service chạy trên host — chuẩn Docker Desktop (Windows/Mac). Khi thay đổi `krakend.json`, cần rebuild: `docker compose up -d --build --force-recreate gateway`.

### Chạy tất cả services cùng lúc

```bash
pnpm nx run-many -t serve \
  --projects=user-service,catalog-service,playlist-service,streaming-service,search-service,upload-service,notification-service,recommend-service \
  --parallel \
  --output-style=stream
```

### Database migrations

Tất cả services đều **tự migrate khi khởi động**, không cần bước riêng:

- **Java services** (Spring Boot): Flyway migration chạy tự động.
- **Go services** (streaming, upload): Dùng embedded SQL (`//go:embed migrations/*.up.sql`) + bảng `schema_migrations` tự quản lý — apply tự động ở đầu `main()`.

Không cần chạy lệnh migrate thủ công.

---

## 5. Chạy Frontend

Frontend là Next.js app nằm trong `frontend/app-frontend/`.

```bash
# Dev server với hot reload
pnpm nx run app-frontend:dev
```

Mở http://localhost:3000.

Biến môi trường đã được copy ở bước 2 (`frontend/app-frontend/.env.local`). Mặc định frontend gọi tất cả API qua Gateway ở `http://localhost:8080`.

### Build production

```bash
pnpm nx run app-frontend:build
pnpm nx run app-frontend:start   # serve production build
```

---

## 6. Lệnh Nx hữu ích

```bash
# Xem toàn bộ dependency graph
pnpm nx graph

# Xem targets của một project
pnpm nx show project catalog-service

# Build một service
pnpm nx run catalog-service:build

# Chạy tests
pnpm nx run-many -t test
pnpm nx run recommend-service:test

# Lint
pnpm nx run-many -t lint
```

---

## Tài liệu thêm

| File | Nội dung |
|---|---|
| [SERVICES.md](SERVICES.md) | Danh sách endpoints của từng service (có trạng thái mock) |
| [api-endpoints-frontend-guide-v2.md](api-endpoints-frontend-guide-v2.md) | API guide chi tiết cho frontend (request/response shapes) |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Chi tiết database schemas, event flows |
| [infra/docker-compose.yml](infra/docker-compose.yml) | Cấu hình toàn bộ infrastructure |
