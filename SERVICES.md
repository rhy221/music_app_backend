# Music App Backend — Services Reference

## Services Overview

| Service | Language / Framework | Port | Spec |
|---------|---------------------|------|------|
| **user-service** | Java 26 / Spring Boot 4 | `8081` | `libs/api-specs/user-service.openapi.yaml` |
| **catalog-service** | Java 26 / Spring Boot 4 | `8082` | `libs/api-specs/catalog-service.openapi.yaml` |
| **playlist-service** | Java 26 / Spring Boot 4 | `8083` | `libs/api-specs/playlist-service.openapi.yaml` |
| **recommend-service** | Python 3.10+ / FastAPI | `8000` | `libs/api-specs/recommend-service.openapi.yaml` |
| **streaming-service** | Go 1.22 / net/http | `8084` | `libs/api-specs/streaming-service.openapi.yaml` |
| **search-service** | TypeScript / NestJS 11 | `8085` | `libs/api-specs/search-service.openapi.yaml` |
| **upload-service** | Go 1.22 / net/http | `8086` | `libs/api-specs/upload-service.openapi.yaml` |
| **notification-service** | TypeScript / NestJS 11 | `8087` | `libs/api-specs/notification-service.openapi.yaml` |
| **gateway** | — | `8080` | `libs/api-specs/gateway.openapi.yaml` |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 20 | |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Java JDK | 26 | |
| Python | ≥ 3.10, < 3.13 | |
| Poetry | ≥ 1.8 | `pip install poetry` |
| Go | ≥ 1.22 | |

---

## First-time Setup (sau khi clone)

```bash
# 1. Cài Node.js dependencies (toàn workspace)
pnpm install

# 2. Cài Python dependencies cho recommend-service
cd services/recommend-service && poetry install && cd ../..

# 3. Cài Python dependencies cho recommend-api-client lib
cd libs/recommend-api-client && poetry install && cd ../..

# 4. (Tùy chọn) Generate API clients từ OpenAPI specs
pnpm nx run-many -t generate

# 5. (Tùy chọn) Build toàn bộ workspace
pnpm nx run-many -t build
```

> **Lưu ý:** Java (Gradle) và Go không cần bước install thủ công —
> Gradle tự tải dependencies khi build; Go chỉ dùng standard library cho mock hiện tại.

---

## Chạy từng service

```bash
# user-service (port 8081)
pnpm nx run user-service:serve

# catalog-service (port 8082)
pnpm nx run catalog-service:serve

# playlist-service (port 8083)
pnpm nx run playlist-service:serve

# recommend-service (port 8000)
pnpm nx run recommend-service:serve

# streaming-service (port 8084)
pnpm nx run streaming-service:serve

# search-service (port 8085)
PORT=8085 pnpm nx run search-service:serve

# upload-service (port 8086)
pnpm nx run upload-service:serve

# notification-service (port 8087)
PORT=8087 pnpm nx run notification-service:serve
```

> **search-service / notification-service** mặc định dùng `PORT=3000`.
> Cần set env variable `PORT` cho đúng port theo spec.

---

## Chạy tất cả services cùng lúc

```bash
# Chạy song song tất cả service có target "serve"
pnpm nx run-many -t serve --parallel

# Hoặc chỉ định từng project
pnpm nx run-many -t serve \
  --projects=user-service,catalog-service,playlist-service,recommend-service,streaming-service,search-service,upload-service,notification-service \
  --parallel
```

> Mỗi service chạy trong process riêng. Log xuất hiện cùng lúc — dùng `--output-style=stream` để dễ đọc hơn.

---

## API Reference

> **Legend:** ✅ Mock đã implement — ⬜ Chưa implement mock

---

### user-service — `http://localhost:8081`

#### Auth

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản mới | ✅ |
| `POST` | `/api/v1/auth/login` | Đăng nhập bằng email + password | ✅ |
| `POST` | `/api/v1/auth/refresh` | Làm mới access token bằng refresh token | ✅ |
| `POST` | `/api/v1/auth/logout` | Revoke refresh token | ✅ |
| `POST` | `/api/v1/auth/oauth2/google` | Đăng nhập / đăng ký bằng Google OAuth2 | ✅ |

#### Profile

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/users/me` | Lấy thông tin user hiện tại | ✅ |
| `PATCH` | `/api/v1/users/me` | Cập nhật profile | ✅ |
| `PUT` | `/api/v1/users/me/avatar` | Upload ảnh đại diện | ⬜ |
| `PUT` | `/api/v1/users/me/password` | Đổi mật khẩu | ⬜ |
| `GET` | `/api/v1/users/{userId}` | Xem profile user khác (public info) | ✅ |
| `POST` | `/api/v1/users/{userId}/follow` | Follow một user | ✅ |
| `DELETE` | `/api/v1/users/{userId}/follow` | Unfollow một user | ✅ |
| `GET` | `/api/v1/users/{userId}/followers` | Danh sách followers | ✅ |
| `GET` | `/api/v1/users/{userId}/following` | Danh sách đang follow | ✅ |

#### Admin

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/admin/users` | [ADMIN] Danh sách tất cả users | ⬜ |
| `PUT` | `/api/v1/admin/users/{userId}/role` | [ADMIN] Thay đổi role | ⬜ |

#### Internal (inter-service)

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/internal/users/{userId}` | [INTERNAL] Lấy user info cho inter-service call | ✅ |
| `POST` | `/api/v1/internal/users/batch` | [INTERNAL] Batch lấy nhiều users | ⬜ |

---

### catalog-service — `http://localhost:8082`

#### Tracks

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/tracks` | Browse tracks (paginated, filterable) | ✅ |
| `GET` | `/api/v1/tracks/popular` | Top tracks phổ biến | ✅ |
| `GET` | `/api/v1/tracks/new-releases` | Tracks mới phát hành | ✅ |
| `GET` | `/api/v1/tracks/{trackId}` | Chi tiết một track | ✅ |
| `PUT` | `/api/v1/tracks/{trackId}` | Cập nhật metadata track | ✅ |
| `DELETE` | `/api/v1/tracks/{trackId}` | Xóa track (soft delete) | ✅ |

#### Albums

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/albums` | Browse albums | ✅ |
| `POST` | `/api/v1/albums` | Tạo album mới (artist) | ✅ |
| `GET` | `/api/v1/albums/{albumId}` | Chi tiết album + danh sách tracks | ✅ |
| `PUT` | `/api/v1/albums/{albumId}` | Cập nhật album | ⬜ |

#### Artists

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/artists` | Browse artists | ✅ |
| `GET` | `/api/v1/artists/{artistId}` | Artist profile + discography | ✅ |
| `PUT` | `/api/v1/artists/{artistId}` | Cập nhật artist profile | ⬜ |

#### Internal (inter-service)

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/internal/tracks/{trackId}` | [INTERNAL] Track info cho inter-service call | ✅ |
| `POST` | `/api/v1/internal/tracks/batch` | [INTERNAL] Batch lấy tracks | ⬜ |
| `POST` | `/api/v1/internal/tracks/publish` | [INTERNAL] Tạo track từ Upload service sau khi transcode | ⬜ |

---

### playlist-service — `http://localhost:8083`

#### Playlists

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/playlists` | Danh sách playlist của user hiện tại | ✅ |
| `POST` | `/api/v1/playlists` | Tạo playlist mới | ✅ |
| `GET` | `/api/v1/playlists/{playlistId}` | Chi tiết playlist + tracks | ✅ |
| `PATCH` | `/api/v1/playlists/{playlistId}` | Cập nhật tên, visibility | ✅ |
| `DELETE` | `/api/v1/playlists/{playlistId}` | Xóa playlist (chỉ owner) | ✅ |
| `GET` | `/api/v1/users/{userId}/playlists` | Playlists public của một user | ✅ |

#### Items

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `POST` | `/api/v1/playlists/{playlistId}/items` | Thêm track vào playlist | ✅ |
| `DELETE` | `/api/v1/playlists/{playlistId}/items/{itemId}` | Xóa track khỏi playlist | ✅ |
| `PUT` | `/api/v1/playlists/{playlistId}/items/reorder` | Sắp xếp lại thứ tự tracks | ⬜ |

#### Collaborators

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/playlists/{playlistId}/collaborators` | Danh sách collaborators | ⬜ |
| `POST` | `/api/v1/playlists/{playlistId}/collaborators` | Mời collaborator (chỉ owner) | ⬜ |
| `DELETE` | `/api/v1/playlists/{playlistId}/collaborators/{userId}` | Xóa collaborator | ⬜ |

---

### recommend-service — `http://localhost:8000`

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/recommendations` | Gợi ý bài hát cho user hiện tại | ✅ |
| `GET` | `/api/v1/recommendations/discover-weekly` | Discover Weekly — playlist gợi ý hàng tuần | ✅ |
| `GET` | `/api/v1/recommendations/similar/{trackId}` | Tracks tương tự (content-based) | ✅ |
| `GET` | `/api/v1/recommendations/radio/{trackId}` | Radio mode — endless queue từ seed track | ✅ |
| `POST` | `/api/v1/recommendations/feedback` | Feedback cho recommendation (like/dislike/skip) | ✅ |
| `GET` | `/api/v1/taste-profile` | Xem taste profile của user | ✅ |
| `POST` | `/api/v1/taste-profile/refresh` | Force rebuild taste profile | ✅ |

---

### streaming-service — `http://localhost:8084`

#### Stream

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/stream/{trackId}` | Stream audio file (HTTP Range Requests) | ✅ |
| `GET` | `/api/v1/stream/{trackId}/hls` | HLS master playlist (.m3u8) | ✅ |

#### Play Sessions

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `POST` | `/api/v1/play-sessions` | Bắt đầu phiên nghe | ✅ |
| `POST` | `/api/v1/play-sessions/{sessionId}/heartbeat` | Cập nhật thời gian đã nghe | ✅ |
| `POST` | `/api/v1/play-sessions/{sessionId}/end` | Kết thúc phiên nghe | ✅ |

#### History

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/history` | Lịch sử nghe của user hiện tại | ✅ |
| `GET` | `/api/v1/history/recently-played` | Tracks nghe gần đây (unique, no duplicate) | ✅ |
| `GET` | `/api/v1/history/stats` | Thống kê nghe nhạc | ✅ |

---

### search-service — `http://localhost:8085`

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/search` | Tìm kiếm tổng hợp (tracks, artists, albums, playlists) | ✅ |
| `GET` | `/api/v1/search/tracks` | Tìm kiếm chỉ tracks | ✅ |
| `GET` | `/api/v1/search/artists` | Tìm kiếm artists | ✅ |
| `GET` | `/api/v1/search/autocomplete` | Search suggestions (gõ tới đâu gợi ý tới đó) | ✅ |

---

### upload-service — `http://localhost:8086`

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `POST` | `/api/v1/upload` | Upload audio file (multipart/form-data) | ✅ |
| `GET` | `/api/v1/upload/jobs` | Danh sách upload jobs của user | ✅ |
| `GET` | `/api/v1/upload/jobs/{jobId}` | Chi tiết upload job + transcode tasks | ✅ |
| `POST` | `/api/v1/upload/jobs/{jobId}/retry` | Retry job bị lỗi | ✅ |
| `POST` | `/api/v1/upload/jobs/{jobId}/cancel` | Hủy job đang processing | ✅ |

---

### notification-service — `http://localhost:8087`

| Method | Path | Description | Mock |
|--------|------|-------------|------|
| `GET` | `/api/v1/notifications` | Danh sách notifications của user | ✅ |
| `GET` | `/api/v1/notifications/unread-count` | Số notification chưa đọc | ✅ |
| `POST` | `/api/v1/notifications/{notificationId}/read` | Đánh dấu đã đọc | ✅ |
| `POST` | `/api/v1/notifications/read-all` | Đánh dấu tất cả đã đọc | ✅ |
| `GET` | `/api/v1/notifications/preferences` | Lấy cài đặt notification | ⬜ |
| `PUT` | `/api/v1/notifications/preferences` | Cập nhật cài đặt notification | ⬜ |
| `WS` | `/ws?token={jwt}` | WebSocket endpoint (realtime push) | ⬜ |

---

## Mock Coverage Summary

| Service | Implemented | Total | Coverage |
|---------|------------|-------|----------|
| user-service | 13 | 18 | 72% |
| catalog-service | 12 | 16 | 75% |
| playlist-service | 8 | 12 | 67% |
| recommend-service | 7 | 7 | **100%** |
| streaming-service | 8 | 8 | **100%** |
| search-service | 4 | 4 | **100%** |
| upload-service | 5 | 5 | **100%** |
| notification-service | 4 | 7 | 57% |
| **Total** | **61** | **77** | **79%** |

---

## Các lệnh hữu ích khác

```bash
# Generate API clients từ tất cả OpenAPI specs
pnpm nx run-many -t generate

# Chạy tests toàn workspace
pnpm nx run-many -t test

# Chạy tests cho một service cụ thể
pnpm nx run search-service:test
pnpm nx run recommend-service:test

# Build một service
pnpm nx run catalog-service:build

# Xem dependency graph
pnpm nx graph

# Xem tất cả targets của một project
pnpm nx show project catalog-service
```
