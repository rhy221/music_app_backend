# Music App — Monorepo

Ứng dụng streaming nhạc, kiến trúc microservices polyglot. Workspace quản lý bằng [Nx](https://nx.dev), package manager là **pnpm**.

---

## Tổng quan kiến trúc

| Service | Stack | Port | Nhiệm vụ |
|---|---|---|---|
| **Gateway** | KrakenD | `8080` | Reverse proxy, JWT validation, rate limiting — single entry point cho toàn bộ API |
| **user-service** | Java 26 / Spring Boot 4 | `8081` | Đăng ký / đăng nhập (email + Google OAuth2), quản lý profile, avatar, follow/unfollow user, phát JWT |
| **catalog-service** | Java 26 / Spring Boot 4 | `8082` | Quản lý bài hát, album, nghệ sĩ; nhận kết quả transcode và publish track; cung cấp internal API cho các service khác |
| **playlist-service** | Java 26 / Spring Boot 4 | `8083` | Tạo và quản lý playlist, thêm/xóa/sắp xếp track, phân quyền collaborator (EDITOR/VIEWER) |
| **streaming-service** | Go 1.22 | `8084` | Phát stream audio từ MinIO với presigned URL, ghi nhận lượt nghe, kiểm tra quyền truy cập file |
| **search-service** | TypeScript / NestJS 11 | `8085` | Full-text search track, artist, album trên Elasticsearch; tiêu thụ catalog events để cập nhật index |
| **upload-service** | Go 1.22 | `8086` | Nhận file audio upload, lưu vào MinIO, phát sự kiện TRACK_UPLOADED để trigger pipeline transcode |
| **notification-service** | TypeScript / NestJS 11 | `8087` | Gửi thông báo real-time (Socket.IO) và email (Nodemailer); tiêu thụ các event từ nhiều service |
| **library-service** | Java 26 / Spring Boot 4 | `8088` | Quản lý thư viện cá nhân: saved tracks, saved albums, followed playlists; đồng bộ metadata qua RabbitMQ |
| **recommend-service** | Python 3.10+ / FastAPI | `8000` | Gợi ý bài hát cá nhân hóa dựa trên lịch sử nghe; dùng Neo4j (graph) + Redis (cache) |
| **Frontend** | Next.js 16 / React 19 | `3000` | SPA streaming music player: browse, search, playlist, upload, profile |

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
- PostgreSQL: tạo 6 databases (user_db, catalog_db, playlist_db, streaming_db, upload_db, library_db)
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
pnpm nx run library-service:serve       # port 8088

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
  --projects=user-service,catalog-service,playlist-service,library-service,streaming-service,search-service,upload-service,notification-service,recommend-service \
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

## 7. Deploy lên Minikube (Kubernetes)

Ngoài cách chạy trực tiếp bằng Docker Compose, project có thể deploy lên Kubernetes local (Minikube) với Helm chart.

### Prerequisites

| Tool | Cài đặt |
|---|---|
| Docker Desktop | `winget install Docker.DockerDesktop` |
| Minikube | `winget install Kubernetes.minikube` |
| kubectl | `winget install Kubernetes.kubectl` |
| Helm | `winget install Helm.Helm` |

> Đóng và mở lại terminal sau khi cài để PATH được cập nhật.

### Bước 1 — Setup Minikube

Chạy **cmd as Administrator** (cần quyền admin để thêm `music-app.local` vào hosts file):

```cmd
k8s\scripts\setup-minikube.bat
```

Script sẽ: khởi động Minikube (4 CPUs, 7GB RAM), bật addons (ingress, metrics-server, dashboard), thêm `music-app.local` vào hosts.

### Bước 2 — Build & Load images

```cmd
:: Build Docker images từ source
k8s\scripts\build-images.bat

:: Load app images vào Minikube
k8s\scripts\load-images.bat

:: Pull infra images trực tiếp trong Minikube daemon
k8s\scripts\pull-infra-images.bat
```

### Bước 3 — Deploy

```cmd
helm upgrade --install music-app k8s\music-app -n music-app --create-namespace --timeout 10m
```

### Bước 4 — Truy cập services

```cmd
:: Mở tất cả port-forwards (giữ terminal mở)
k8s\scripts\port-forward.bat
```

| Service | URL | Credentials |
|---|---|---|
| Gateway API | http://localhost:8080 | — |
| Grafana | http://localhost:3001 | `admin` / `music_pass` |
| Jaeger UI | http://localhost:16686 | — |
| Prometheus | http://localhost:9090 | — |
| RabbitMQ Management | http://localhost:15672 | `music_admin` / `music_pass` |
| MinIO Console | http://localhost:9001 | `music_admin` / `music_pass` |
| Neo4j Browser | http://localhost:7474 | `neo4j` / `music_pass` |

### Frontend với K8s backend

Trong `frontend/app-frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:8087
NEXT_PUBLIC_MINIO_URL=/storage
```

Chạy frontend bình thường: `pnpm nx run app-frontend:dev`.

### Lệnh hữu ích

```cmd
:: Xem trạng thái pods
kubectl get pods -n music-app

:: Xem logs một service
kubectl logs -n music-app -l app.kubernetes.io/name=user-service --tail=50

:: Restart một service
kubectl rollout restart deployment user-service -n music-app

:: Upgrade sau khi sửa Helm chart
helm upgrade music-app k8s\music-app -n music-app --timeout 10m

:: Mở Kubernetes Dashboard
minikube dashboard

:: Dừng Minikube
minikube stop
```

### Cấu trúc K8s

```
k8s/
├── scripts/
│   ├── setup-minikube.bat       # Setup Minikube + addons
│   ├── build-images.bat         # Build Docker images
│   ├── load-images.bat          # Load app images vào Minikube
│   ├── pull-infra-images.bat    # Pull infra images trong Minikube
│   └── port-forward.bat         # Port-forward tất cả services
│
└── music-app/                   # Helm Chart
    ├── Chart.yaml
    ├── values.yaml              # Config tập trung (images, resources, secrets)
    └── templates/
        ├── infra/               # PostgreSQL, Redis, RabbitMQ, MongoDB, Neo4j, ES, MinIO
        ├── services/            # 10 app services + HPA
        └── monitoring/          # Prometheus, Grafana, Jaeger
```

---

## Tài liệu thêm

| File | Nội dung |
|---|---|
| [SERVICES.md](SERVICES.md) | Danh sách endpoints của từng service (có trạng thái mock) |
| [api-endpoints-frontend-guide-v2.md](api-endpoints-frontend-guide-v2.md) | API guide chi tiết cho frontend (request/response shapes) |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Chi tiết database schemas, event flows |
| [infra/docker-compose.yml](infra/docker-compose.yml) | Cấu hình toàn bộ infrastructure |
