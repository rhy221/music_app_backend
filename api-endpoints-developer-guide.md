# API Endpoints Developer Guide

> Tài liệu hướng dẫn triển khai tất cả endpoints. Mỗi endpoint mô tả: chức năng, DTOs, logic cần code, data flow, error cases.  
> Tham chiếu OpenAPI specs trong `libs/api-specs/` để xem schema chi tiết.

---

## Quy ước chung

**Authentication:** Tất cả endpoints có icon 🔒 yêu cầu JWT trong header `Authorization: Bearer {token}`. Gateway validate JWT trước khi forward — service nhận `X-User-Id` header đã verify.

**Pagination:** Endpoints trả list dùng format `{ content, page, size, totalElements, totalPages }`. Query params: `page` (0-based), `size` (default 20, max 100).

**Error format:** Tất cả services trả lỗi dạng `{ status, error, message, timestamp }`.

**Internal endpoints:** Prefix `/api/v1/internal/` — chỉ cho inter-service calls, không expose qua Gateway.

---

## 1. User Service (Java / Spring Boot) — 18 endpoints

### 1.1 Auth

#### `POST /api/v1/auth/register` — registerUser

Đăng ký tài khoản mới.

- **Request:** `RegisterRequest { email, password, displayName }`
- **Response:** `AuthResponse { accessToken, refreshToken, expiresIn, tokenType, user }`
- **Logic cần code:**
  1. Validate email format + uniqueness (query `users` WHERE email).
  2. Hash password bằng BCrypt (strength 12).
  3. INSERT vào `users` table (role = LISTENER).
  4. Generate JWT access token (exp 1h) + refresh token (exp 7d).
  5. INSERT refresh token vào `refresh_tokens` table.
  6. Publish `UserRegisteredEvent` qua RabbitMQ (exchange `events.user`).
  7. Trả `AuthResponse` với user profile.
- **Error cases:** 409 email đã tồn tại, 400 password < 8 ký tự.
- **Data flow:** PostgreSQL (user_db) → RabbitMQ → Notification service tạo welcome notification.

#### `POST /api/v1/auth/login` — loginUser

Đăng nhập bằng email + password.

- **Request:** `LoginRequest { email, password }`
- **Response:** `AuthResponse`
- **Logic:**
  1. Query user by email.
  2. BCrypt.matches(password, user.passwordHash).
  3. Generate access + refresh tokens.
  4. INSERT refresh token.
  5. Trả `AuthResponse`.
- **Error cases:** 401 sai email hoặc password. Không phân biệt "email không tồn tại" vs "sai password" (security).

#### `POST /api/v1/auth/refresh` — refreshToken

Làm mới access token khi hết hạn.

- **Request:** `RefreshTokenRequest { refreshToken }`
- **Response:** `AuthResponse`
- **Logic:**
  1. Query `refresh_tokens` WHERE token = ? AND revoked = FALSE.
  2. Kiểm tra expires_at > NOW().
  3. Revoke token cũ (SET revoked = TRUE).
  4. Generate access + refresh token mới.
  5. INSERT refresh token mới.
- **Error cases:** 401 token không tồn tại, đã revoke, hoặc hết hạn.

#### `POST /api/v1/auth/logout` — logoutUser 🔒

Revoke refresh token.

- **Request:** `RefreshTokenRequest { refreshToken }`
- **Logic:**
  1. Verify JWT access token (middleware).
  2. UPDATE `refresh_tokens` SET revoked = TRUE WHERE token = ?.
  3. (Optional) Thêm access token vào Redis blacklist (key `session:{userId}`, TTL = remaining token lifetime).
- **Response:** 204 No Content.

#### `POST /api/v1/auth/oauth2/google` — loginWithGoogle

Login/register qua Google OAuth2.

- **Request:** `OAuth2GoogleRequest { idToken }`
- **Response:** `AuthResponse`
- **Logic:**
  1. Verify Google ID token (gọi Google API hoặc dùng Spring Security OAuth2).
  2. Extract email, name, avatar từ token payload.
  3. Query `oauth_accounts` WHERE provider = 'google' AND provider_id = ?.
  4. Nếu tồn tại: lấy user, generate tokens.
  5. Nếu chưa: INSERT `users` (random password, email_verified = TRUE) + INSERT `oauth_accounts`. Publish `UserRegisteredEvent`.
  6. Trả `AuthResponse`.

### 1.2 Profile

#### `GET /api/v1/users/me` — getCurrentUser 🔒

Lấy profile user đang đăng nhập.

- **Response:** `UserProfile { id, email, displayName, avatarUrl, role, followerCount, followingCount, createdAt }`
- **Logic:** Query `users` WHERE id = X-User-Id. Count followers/following từ `follows` table.

#### `PATCH /api/v1/users/me` — updateCurrentUser 🔒

Cập nhật displayName, bio.

- **Request:** `UpdateProfileRequest { displayName?, bio? }`
- **Response:** `UserProfile`
- **Logic:** UPDATE users SET displayName = ?, bio = ? WHERE id = X-User-Id. Chỉ update fields có trong request (partial update).

#### `PUT /api/v1/users/me/avatar` — uploadAvatar 🔒

Upload ảnh đại diện.

- **Request:** multipart/form-data `{ file: binary }`
- **Response:** `{ avatarUrl: string }`
- **Logic:**
  1. Validate file type (JPG/PNG) + size (≤ 5MB).
  2. Resize ảnh (300×300) bằng thư viện image processing.
  3. Upload lên MinIO bucket `images/users/{userId}/avatar.jpg`.
  4. UPDATE users SET avatar_url = minioUrl.
  5. Trả URL mới.

#### `PUT /api/v1/users/me/password` — changePassword 🔒

Đổi mật khẩu.

- **Request:** `ChangePasswordRequest { currentPassword, newPassword }`
- **Logic:**
  1. BCrypt.matches(currentPassword, user.passwordHash).
  2. Hash newPassword.
  3. UPDATE users SET password_hash = ?.
  4. Revoke tất cả refresh tokens (force re-login trên devices khác).
- **Error cases:** 400 mật khẩu cũ sai.

#### `GET /api/v1/users/{userId}` — getUserById

Xem profile user khác (public info, không cần auth).

- **Response:** `PublicUserProfile { id, displayName, avatarUrl, role, followerCount, followingCount, isFollowing }`
- **Logic:** Query user. Nếu caller đã login (có X-User-Id): check `follows` table để set `isFollowing`.

#### `POST /api/v1/users/{userId}/follow` — followUser 🔒

Follow một user.

- **Logic:**
  1. Check follower_id ≠ following_id.
  2. INSERT INTO `follows` (follower_id, following_id).
  3. Publish `UserFollowedEvent` → RabbitMQ → Notification service.
- **Error cases:** 409 đã follow.

#### `DELETE /api/v1/users/{userId}/follow` — unfollowUser 🔒

Unfollow.

- **Logic:** DELETE FROM `follows` WHERE follower_id = ? AND following_id = ?.

#### `GET /api/v1/users/{userId}/followers` — getUserFollowers

Danh sách followers, paginated.

- **Response:** `PaginatedUsers`
- **Logic:** SELECT u.* FROM users u JOIN follows f ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC.

#### `GET /api/v1/users/{userId}/following` — getUserFollowing

Danh sách đang follow, paginated. Logic tương tự trên nhưng JOIN ngược.

### 1.3 Admin

#### `GET /api/v1/admin/users` — listAllUsers 🔒 (ADMIN)

Liệt kê users, filter theo role, search theo name/email.

- **Logic:** `@PreAuthorize("hasRole('ADMIN')")`. JPA Specification dynamic query: filter role + search displayName/email LIKE %?%.

#### `PUT /api/v1/admin/users/{userId}/role` — updateUserRole 🔒 (ADMIN)

Thay đổi role (LISTENER → ARTIST, etc).

- **Request:** `{ role: "ARTIST" }`
- **Logic:** UPDATE users SET role = ? WHERE id = ?. Nếu promote lên ARTIST: tạo Artist record trong Catalog (qua REST call hoặc event).

### 1.4 Internal (inter-service)

#### `GET /api/v1/internal/users/{userId}` — getInternalUserById

Trả minimal user info cho service khác.

- **Response:** `InternalUserDto { id, displayName, avatarUrl, role }`
- **Logic:** Simple SELECT, không count followers. Không expose qua Gateway.

#### `POST /api/v1/internal/users/batch` — getInternalUsersBatch

Batch resolve user IDs → user info. Cho Playlist resolve collaborator names.

- **Request:** `{ userIds: ["uuid1", "uuid2", ...] }` (max 100)
- **Response:** `Map<UUID, InternalUserDto>`
- **Logic:** SELECT * FROM users WHERE id IN (?). Return map.

---

## 2. Catalog Service (Java / Spring Boot) — 16 endpoints

### 2.1 Tracks

#### `GET /api/v1/tracks` — listTracks

Browse tracks, paginated + filterable.

- **Params:** page, size, genre, artistId, albumId, sort (newest/oldest/popular/title_asc/title_desc)
- **Response:** `PaginatedTracks` chứa `TrackSummary` array
- **Logic:** JPA Specification builder:
  1. Nếu genre != null: spec.and(trackGenreEquals(genre))
  2. Nếu artistId != null: spec.and(trackArtistIdEquals(artistId))
  3. Apply sort: popular → ORDER BY play_count DESC
  4. trackRepository.findAll(spec, pageable)
  5. Map entity → TrackSummary DTO (MapStruct).
- **Data flow:** PostgreSQL (catalog_db) → DTO response. Redis cache optional (key `cache:tracks:list:{hash(params)}`).

#### `GET /api/v1/tracks/{trackId}` — getTrackById

Chi tiết một track bao gồm assets (audio URLs theo bitrate).

- **Response:** `TrackDetail` = TrackSummary + status, assets[], waveformUrl, createdAt, updatedAt
- **Logic:** `trackRepository.findByIdWithArtistAndAssets(trackId)` — dùng `@EntityGraph` hoặc `JOIN FETCH` để tránh N+1. Map → DTO.
- **Error cases:** 404 track không tồn tại.

#### `PUT /api/v1/tracks/{trackId}` — updateTrack 🔒

Cập nhật metadata (title, genre, albumId, releaseDate).

- **Request:** `UpdateTrackRequest { title?, genre?, albumId?, releaseDate? }`
- **Logic:**
  1. Verify ownership: track.artist.userId == X-User-Id HOẶC role == ADMIN.
  2. Partial update entity.
  3. Save.
  4. Publish `TrackUpdatedEvent` → RabbitMQ → Search re-index + Streaming cache update.
- **Error cases:** 403 không phải owner.

#### `DELETE /api/v1/tracks/{trackId}` — deleteTrack 🔒

Soft delete (status = ARCHIVED).

- **Logic:**
  1. Verify ownership.
  2. UPDATE status = 'ARCHIVED'.
  3. Publish `TrackDeletedEvent` → Search xóa khỏi ES, Streaming xóa cache.
  4. KHÔNG xóa audio files khỏi MinIO (có thể unarchive sau).

#### `GET /api/v1/tracks/popular` — getPopularTracks

Top tracks phổ biến.

- **Params:** limit (max 50), genre, period (day/week/month/all)
- **Response:** `TrackSummary[]`
- **Logic:**
  1. Check Redis cache `cache:tracks:popular:{genre}:{period}` (TTL 5 phút).
  2. Cache miss: SELECT từ tracks ORDER BY play_count DESC, filter by genre, filter by period (created_at > NOW() - interval).
  3. Set Redis cache.
- **Data flow:** Redis → (miss) PostgreSQL → Redis.

#### `GET /api/v1/tracks/new-releases` — getNewReleases

Tracks mới phát hành.

- **Logic:** SELECT WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT ?. Cache Redis 5 phút.

### 2.2 Albums

#### `GET /api/v1/albums` — listAlbums

Browse albums, filter by artistId.

- **Response:** `PaginatedAlbums` chứa `AlbumSummary`
- **Logic:** JPA query with optional artistId filter.

#### `POST /api/v1/albums` — createAlbum 🔒

Tạo album mới (artist role).

- **Request:** `CreateAlbumRequest { title, releaseDate?, coverUrl? }`
- **Logic:**
  1. Verify role == ARTIST.
  2. Tìm Artist record linked to X-User-Id.
  3. INSERT album.

#### `GET /api/v1/albums/{albumId}` — getAlbumById

Album detail + danh sách tracks.

- **Response:** `AlbumDetail` = AlbumSummary + artist, tracks[], totalDurationMs
- **Logic:** Query album + JOIN tracks WHERE album_id = ? ORDER BY track_number.

#### `PUT /api/v1/albums/{albumId}` — updateAlbum 🔒

Cập nhật album info. Verify ownership. Publish event nếu title/cover thay đổi.

### 2.3 Artists

#### `GET /api/v1/artists` — listArtists

Browse artists, paginated.

#### `GET /api/v1/artists/{artistId}` — getArtistById

Artist profile + top tracks + albums.

- **Response:** `ArtistDetail` = ArtistSummary + bio, userId, trackCount, albumCount, followerCount, topTracks[], albums[]
- **Logic:** Query artist + COUNT tracks + COUNT albums. Top tracks: SELECT ORDER BY play_count DESC LIMIT 10.

#### `PUT /api/v1/artists/{artistId}` — updateArtist 🔒

Cập nhật name, bio, avatarUrl. Verify artist.userId == X-User-Id.

### 2.4 Internal

#### `GET /api/v1/internal/tracks/{trackId}` — getInternalTrack

Minimal track info cho inter-service calls.

- **Response:** `InternalTrackDto { id, title, durationMs, coverUrl, genre, artistId, artistName, assets[] }`
- **Consumer:** Streaming service (cache track metadata), Playlist service (validate trackId).

#### `POST /api/v1/internal/tracks/batch` — getInternalTracksBatch

Batch resolve track IDs. Max 200 IDs.

- **Response:** `Map<UUID, InternalTrackDto>`
- **Consumer:** Playlist service resolve track titles/covers cho UI.

#### `POST /api/v1/internal/tracks/publish` — publishTrackFromUpload

Tạo track + assets từ Upload service sau khi transcode xong. Đây là Saga step.

- **Request:** `PublishTrackRequest { uploadJobId, uploaderId, title, durationMs, genre?, albumId?, assets[], waveformUrl? }`
- **Logic:**
  1. Tìm Artist record by uploaderId.
  2. INSERT track (status = PUBLISHED).
  3. INSERT audio_assets cho mỗi bitrate.
  4. Publish `TrackPublishedEvent` (chứa đầy đủ track + artist + album info cho consumers).
- **Data flow:** Upload event → Catalog DB → RabbitMQ → Search index ES, Streaming cache, Neo4j graph, Notification.
- **Error cases:** 400 nếu uploaderId không có Artist record.

---

## 3. Playlist Service (Java / Spring Boot) — 12 endpoints

### 3.1 Playlist CRUD

#### `GET /api/v1/playlists` — getMyPlaylists 🔒

Danh sách playlist của user hiện tại (owned + collaborating).

- **Response:** `PaginatedPlaylists` chứa `PlaylistSummary`
- **Logic:** SELECT WHERE owner_id = ? UNION SELECT WHERE id IN (SELECT playlist_id FROM collaborators WHERE user_id = ?). Sorted by updated_at DESC.

#### `POST /api/v1/playlists` — createPlaylist 🔒

Tạo playlist mới.

- **Request:** `CreatePlaylistRequest { name, description?, visibility? }`
- **Response:** `PlaylistDetail`
- **Logic:**
  1. Validate name (1-100 chars).
  2. INSERT playlists (owner_id = X-User-Id, track_count = 0, visibility = PRIVATE default).
  3. Trả PlaylistDetail (items = [], collaborators = []).

#### `GET /api/v1/playlists/{playlistId}` — getPlaylistById

Chi tiết playlist + tất cả items + collaborators.

- **Response:** `PlaylistDetail { ...summary, items[], collaborators[], isOwner, canEdit }`
- **Logic:**
  1. Query playlist.
  2. Check access: PUBLIC → cho phép tất cả. PRIVATE → chỉ owner + collaborators. UNLISTED → ai có link.
  3. Query items ORDER BY position. Items chứa denormalized track info (track_title, artist_name — synced từ events).
  4. Query collaborators. JOIN User service (batch API) để lấy displayName, avatarUrl nếu chưa denormalize.
  5. Set `isOwner = (owner_id == X-User-Id)`, `canEdit = isOwner || collaborator.role == EDITOR`.
- **Error cases:** 403 playlist PRIVATE và không phải owner/collaborator. 404 playlist không tồn tại.

#### `PATCH /api/v1/playlists/{playlistId}` — updatePlaylist 🔒

Cập nhật name, description, visibility. Chỉ owner.

- **Request:** `UpdatePlaylistRequest { name?, description?, visibility? }`
- **Logic:**
  1. Verify ownership.
  2. Partial update.
  3. Nếu visibility thay đổi sang PUBLIC: có thể publish event `PlaylistSharedEvent`.

#### `DELETE /api/v1/playlists/{playlistId}` — deletePlaylist 🔒

Xóa playlist. Chỉ owner. CASCADE xóa items + collaborators.

### 3.2 Items (thông qua Aggregate Root)

#### `POST /api/v1/playlists/{playlistId}/items` — addTrackToPlaylist 🔒

Thêm track vào playlist. **Đây là DDD Aggregate Root method.**

- **Request:** `AddTrackRequest { trackId, position? }`
- **Response:** `PlaylistItem`
- **Logic (Aggregate Root enforce invariants):**
  1. Verify canEdit (owner hoặc EDITOR collaborator).
  2. **Invariant check:** track_count < 1000 (business rule).
  3. **Duplicate check:** track_id chưa có trong playlist (UNIQUE constraint).
  4. **Validate trackId tồn tại:** gọi Catalog internal API `GET /internal/tracks/{trackId}`. Lấy luôn title, duration, coverUrl, artistName.
  5. Nếu position == null: position = track_count (append cuối).
  6. Nếu position specified: UPDATE items SET position = position + 1 WHERE position >= ?.
  7. INSERT playlist_items (denormalize track_title, artist_name từ step 4).
  8. UPDATE playlists SET track_count = track_count + 1, total_duration_ms += track.durationMs, updated_at = NOW().
  9. **Tất cả trong 1 @Transactional** — đảm bảo consistency.
  10. Publish `PlaylistTrackAddedEvent` → Notification service notify collaborators.
- **Error cases:** 400 playlist đầy (>1000), 400 track đã có, 403 không có quyền edit, 404 track không tồn tại.
- **Data flow:** Catalog API (validate) → PostgreSQL (playlist_db, transactional) → RabbitMQ → Notification (MongoDB).

#### `DELETE /api/v1/playlists/{playlistId}/items/{itemId}` — removeTrackFromPlaylist 🔒

Xóa track khỏi playlist.

- **Logic (Aggregate Root):**
  1. Verify canEdit.
  2. DELETE FROM playlist_items WHERE id = ?.
  3. Re-calculate: UPDATE remaining items SET position = position - 1 WHERE position > deleted_position.
  4. UPDATE playlists SET track_count -= 1, total_duration_ms -= track_duration.
  5. @Transactional.

#### `PUT /api/v1/playlists/{playlistId}/items/reorder` — reorderPlaylistItems 🔒

Sắp xếp lại thứ tự.

- **Request:** `ReorderRequest { itemIds: ["uuid1", "uuid2", ...] }` — toàn bộ item IDs theo thứ tự mới.
- **Logic:**
  1. Verify canEdit.
  2. Validate: itemIds phải chứa đúng tất cả items hiện có (không thêm, không bớt).
  3. Batch UPDATE position cho mỗi item: SET position = indexOf(itemId) trong array.
  4. @Transactional.

### 3.3 Collaboration

#### `GET /api/v1/playlists/{playlistId}/collaborators` — getCollaborators

Danh sách collaborators.

- **Response:** `Collaborator[]` với denormalized displayName, avatarUrl.

#### `POST /api/v1/playlists/{playlistId}/collaborators` — addCollaborator 🔒

Mời collaborator. Chỉ owner.

- **Request:** `AddCollaboratorRequest { userId, role: "EDITOR" | "VIEWER" }`
- **Logic:**
  1. Verify ownership.
  2. Gọi User internal API để validate userId tồn tại + lấy displayName.
  3. INSERT collaborators (denormalize user info).
  4. Publish `CollaboratorAddedEvent` → Notification.

#### `DELETE /api/v1/playlists/{playlistId}/collaborators/{userId}` — removeCollaborator 🔒

Xóa collaborator. Owner hoặc collaborator tự rời.

#### `GET /api/v1/users/{userId}/playlists` — getUserPublicPlaylists

Playlists PUBLIC của một user bất kỳ. Không cần auth.

---

## 4. Streaming Service (Go / Gin) — 8 endpoints

### 4.1 Audio streaming

#### `GET /api/v1/stream/{trackId}` — streamTrack 🔒

Serve audio file qua HTTP Range Requests.

- **Params:** `bitrate` (128/256/320, default 320), header `Range: bytes=0-1048575`
- **Response:** 200 (full file) hoặc 206 Partial Content
- **Logic (Go):**
  1. Lookup track metadata từ `track_cache` table (local PostgreSQL). Nếu cache miss → gọi Catalog internal API + cache.
  2. Chọn asset URL theo bitrate requested. Fallback bitrate thấp hơn nếu không có.
  3. Lấy file từ MinIO bằng `minio.GetObject()`.
  4. Parse `Range` header → tính byte range.
  5. Set response headers: `Content-Type: audio/mpeg`, `Accept-Ranges: bytes`, `Content-Range: bytes start-end/total`, `Content-Length`.
  6. Stream data bằng `io.Copy(w, reader)` — zero-copy, không buffer toàn bộ file vào RAM.
- **Performance:** Go goroutine per request, xử lý 100K+ concurrent streams. `io.Copy` zero-copy từ MinIO reader → HTTP response writer.
- **Data flow:** track_cache (PostgreSQL) → MinIO (file read) → HTTP response (streaming).

#### `GET /api/v1/stream/{trackId}/hls` — getHlsPlaylist 🔒

HLS master playlist (.m3u8) cho adaptive bitrate.

- **Response:** `application/vnd.apple.mpegurl`
- **Logic:** Generate .m3u8 playlist liệt kê available bitrates + segment URLs. Mỗi segment URL trỏ về `streamTrack` endpoint với range.

### 4.2 Play session lifecycle

#### `POST /api/v1/play-sessions` — startPlaySession 🔒

Bắt đầu phiên nghe. Gọi khi user bấm Play.

- **Request:** `StartPlaySessionRequest { trackId, bitrate?, source? }`
- **Response:** `PlaySession { id, trackId, userId, startedAt, positionMs, status: "PLAYING" }`
- **Logic:**
  1. INSERT play_sessions (status = PLAYING, position_ms = 0).
  2. Trả session ID cho client — client dùng ID này cho heartbeat + end.

#### `POST /api/v1/play-sessions/{sessionId}/heartbeat` — playSessionHeartbeat 🔒

Client gửi mỗi 10-15 giây để cập nhật vị trí nghe.

- **Request:** `HeartbeatRequest { positionMs }`
- **Response:** `PlaySession`
- **Logic:**
  1. UPDATE play_sessions SET position_ms = ?, duration_ms = duration_ms + (positionMs - old_positionMs).
  2. **Check ngưỡng:** nếu duration_ms ≥ 30000 (30s) HOẶC position_ms ≥ track_duration * 0.5:
     - SET completed = TRUE (lần đầu).
     - Redis INCR `playcount:{trackId}`.
     - Publish `TrackPlayedEvent` qua RabbitMQ (enriched: userId, trackId, genre, artistId, durationMs, source).
  3. Chỉ emit event 1 lần (check completed trước khi emit).
- **Data flow (khi đạt ngưỡng):** PostgreSQL → Redis (INCR) → RabbitMQ → Neo4j (MERGE edge), Catalog (batch play_count update), Notification (milestones).

#### `POST /api/v1/play-sessions/{sessionId}/end` — endPlaySession 🔒

Kết thúc phiên nghe.

- **Request:** `EndPlaySessionRequest { positionMs, reason: "COMPLETED" | "SKIPPED" | "PAUSED_TIMEOUT" | "ERROR" }`
- **Logic:**
  1. UPDATE play_sessions SET status = 'ENDED', ended_at = NOW(), position_ms = ?, reason.
  2. Nếu chưa completed và đạt ngưỡng: trigger play count + event (same as heartbeat).

### 4.3 Play history

#### `GET /api/v1/history` — getPlayHistory 🔒

Lịch sử nghe, paginated.

- **Response:** `PaginatedPlayHistory` chứa `PlayHistoryEntry { trackId, trackTitle, artistName, coverUrl, durationMs, playedAt, listenedMs }`
- **Logic:** SELECT ps.*, tc.title, tc.artist_name FROM play_sessions ps JOIN track_cache tc ON ps.track_id = tc.track_id WHERE ps.user_id = ? AND ps.completed = TRUE ORDER BY ps.started_at DESC.

#### `GET /api/v1/history/recently-played` — getRecentlyPlayed 🔒

Tracks nghe gần đây, unique (không duplicate).

- **Logic:** SELECT DISTINCT ON (track_id) ... ORDER BY started_at DESC LIMIT ?. PostgreSQL DISTINCT ON rất hiệu quả cho query này.

#### `GET /api/v1/history/stats` — getListeningStats 🔒

Thống kê nghe nhạc.

- **Response:** `ListeningStats { totalListeningMs, totalTracks, totalSessions, topGenres[], topArtists[] }`
- **Logic:** Aggregate queries trên play_sessions JOIN track_cache. Filter by period. GROUP BY genre/artist_id, ORDER BY COUNT DESC.

---

## 5. Upload Service (Go / Fiber) — 5 endpoints

#### `POST /api/v1/upload` — uploadTrack 🔒 (ARTIST role)

Upload audio file. **Saga step 1.**

- **Request:** multipart/form-data `{ file, title, genre?, albumId? }`
- **Response:** 202 Accepted `UploadJob { id, status: "UPLOADING", ... }`
- **Logic:**
  1. Verify role == ARTIST (từ JWT claims).
  2. Validate file: format (MP3/FLAC/WAV/AAC), size (≤ 200MB).
  3. Stream file lên MinIO `audio-originals/{jobId}/{filename}` — Go `io.Copy` không buffer toàn bộ vào RAM.
  4. Extract metadata: duration, format, size (dùng FFprobe).
  5. INSERT upload_jobs (status = UPLOADING).
  6. Publish `TrackUploadedEvent` → RabbitMQ.
  7. **Self-consume event** (hoặc goroutine trực tiếp): bắt đầu transcode.
  8. UPDATE status = TRANSCODING.
  9. Chạy FFmpeg parallel cho 3 bitrates (128k, 256k, 320k) bằng goroutine worker pool.
  10. Upload transcoded files lên MinIO `audio-transcoded/{jobId}/`.
  11. INSERT transcode_tasks (status = COMPLETED cho mỗi task).
  12. Generate waveform data.
  13. Khi tất cả tasks COMPLETED: publish `TranscodeCompletedEvent` → Catalog service tạo track.
  14. Listen for `TrackPublishedEvent` từ Catalog → UPDATE status = PUBLISHED, track_id = catalog_track_id.
- **Compensation (nếu fail):** DELETE files từ MinIO, status = FAILED, publish `TranscodeFailedEvent` → Notification email uploader.
- **Data flow:** Client → MinIO (file) → PostgreSQL (job) → FFmpeg → MinIO (transcoded) → RabbitMQ → Catalog → Search + Streaming + Neo4j.

#### `GET /api/v1/upload/jobs` — getMyUploadJobs 🔒

Danh sách upload jobs, filter by status.

- **Params:** status?, page, size
- **Logic:** SELECT WHERE uploader_id = ? AND (status = ? OR true) ORDER BY created_at DESC.

#### `GET /api/v1/upload/jobs/{jobId}` — getUploadJobById 🔒

Chi tiết job + transcode tasks.

- **Response:** `UploadJobDetail { ...job, originalSizeBytes, originalFormat, tasks[] }`
- **Logic:** Query job + JOIN transcode_tasks. Verify uploader_id == X-User-Id.

#### `POST /api/v1/upload/jobs/{jobId}/retry` — retryUploadJob 🔒

Retry job bị FAILED. Reset failed tasks, re-run transcode.

- **Logic:** Verify status == FAILED. UPDATE status = TRANSCODING. Re-trigger FFmpeg cho failed tasks.

#### `POST /api/v1/upload/jobs/{jobId}/cancel` — cancelUploadJob 🔒

Hủy job đang processing. **Saga compensation.**

- **Logic:** DELETE files từ MinIO. UPDATE status = CANCELLED. Kill running FFmpeg processes (nếu có).

---

## 6. Search Service (TypeScript / Fastify) — 4 endpoints

#### `GET /api/v1/search` — search

Tìm kiếm tổng hợp (tracks + artists + albums + playlists).

- **Params:** `q` (required), type[] (filter result types), genre, page, size
- **Response:** `SearchResponse { tracks: { items, total }, artists: { items, total }, albums: { items, total }, playlists: { items, total }, totalResults, queryTimeMs }`
- **Logic (TypeScript + @elastic/elasticsearch):**
  1. Build Elasticsearch `multi_search` query (1 query per type).
  2. Mỗi type query: `multi_match` trên relevant fields (title, artist.name, album.title) với `fuzziness: "AUTO"`.
  3. Nếu type[] specified: chỉ query types đó.
  4. Execute `msearch()`.
  5. Map ES hits → SearchHit DTOs. Include highlights.
  6. Set queryTimeMs = ES took field.
- **Data flow:** Client → Elasticsearch (query) → Response. Không touch PostgreSQL.

#### `GET /api/v1/search/tracks` — searchTracks

Tìm kiếm chỉ tracks, sort by relevance/newest/popular.

- **Params:** q, genre?, artistId?, sort (relevance/newest/popular/title), page, size
- **Logic:** ES `bool` query: must (multi_match on q) + filter (genre, artistId). Sort: relevance = _score, newest = createdAt, popular = playCount.

#### `GET /api/v1/search/artists` — searchArtists

Tìm kiếm artists.

- **Logic:** ES query trên `artists` index, match on name field.

#### `GET /api/v1/search/autocomplete` — autocomplete

Gợi ý khi gõ (completion suggester).

- **Params:** `q` (min 1 char), limit (default 5)
- **Response:** `AutocompleteResponse { suggestions: [{ text, type, id, imageUrl }] }`
- **Logic:** ES `suggest` query dùng `completion` field trên tracks.title.suggest + artists.name.suggest. Merge results, sort by score, limit.

### Event consumers (background, không phải HTTP endpoint)

Search service cũng chạy RabbitMQ consumers (amqplib):

- **TrackPublishedEvent** → `esClient.index()` upsert track document (denormalized: track + artist + album in 1 doc).
- **TrackUpdatedEvent** → `esClient.update()` partial update.
- **TrackDeletedEvent** → `esClient.delete()`.

---

## 7. Notification Service (TypeScript / Fastify) — 7 endpoints

#### `GET /api/v1/notifications` — getNotifications 🔒

Danh sách notifications, paginated.

- **Params:** unreadOnly (boolean), type (filter), page, size
- **Response:** `PaginatedNotifications { content, page, size, totalElements, totalPages, unreadCount }`
- **Logic (Mongoose):**
  1. Build MongoDB query: `{ userId, ...(unreadOnly && { read: false }), ...(type && { type }) }`.
  2. Sort: `{ createdAt: -1 }`.
  3. `Notification.find(query).sort().skip(page*size).limit(size)`.
  4. `Notification.countDocuments(query)` cho total.
  5. Redis GET `unread:{userId}` cho unreadCount.

#### `GET /api/v1/notifications/unread-count` — getUnreadCount 🔒

Số notification chưa đọc. Dùng cho badge trên UI.

- **Response:** `{ count: number }`
- **Logic:** Redis GET `unread:{userId}`. Nếu key không tồn tại: MongoDB countDocuments({ userId, read: false }) → SET Redis.

#### `POST /api/v1/notifications/{notificationId}/read` — markAsRead 🔒

Đánh dấu 1 notification đã đọc.

- **Logic:**
  1. `Notification.updateOne({ _id, userId }, { $set: { read: true } })`.
  2. Redis DECR `unread:{userId}`.

#### `POST /api/v1/notifications/read-all` — markAllAsRead 🔒

Đánh dấu tất cả đã đọc.

- **Logic:**
  1. `Notification.updateMany({ userId, read: false }, { $set: { read: true } })`.
  2. Redis SET `unread:{userId}` = 0.

#### `GET /api/v1/notifications/preferences` — getNotificationPreferences 🔒

Lấy cài đặt notification.

- **Response:** `NotificationPreferences`
- **Logic:** `Preference.findOne({ userId })`. Nếu chưa có: trả default values.

#### `PUT /api/v1/notifications/preferences` — updateNotificationPreferences 🔒

Cập nhật cài đặt.

- **Logic:** `Preference.findOneAndUpdate({ userId }, { $set: body }, { upsert: true })`.

#### `GET /ws` — websocketConnect

WebSocket endpoint cho realtime push.

- **Protocol:** ws://host:8087/ws?token={jwt}
- **Logic:**
  1. On connection: verify JWT từ query param. Extract userId.
  2. Redis SADD `online:{userId}`.
  3. Subscribe to user's notification channel.
  4. **Server → Client:** `{ type: "notification", payload: NotificationDoc }`.
  5. **Client → Server:** `{ type: "ack", notificationId }` → markAsRead. `{ type: "ping" }` → pong.
  6. On disconnect: Redis SREM `online:{userId}`.

### Event consumers (background)

- **UserFollowedEvent** → check preferences → create MongoDB doc (expiresAt per type) → Redis INCR unread → if online: WS push → if email enabled: Nodemailer.
- **PlaylistSharedEvent, CollaboratorAddedEvent, PlaylistTrackAddedEvent** → same flow.
- **TrackPublishedEvent** → notify followers of artist (query User service for follower IDs).
- **TranscodeFailedEvent** → notify uploader (always, ignore preferences).

---

## 8. Recommend Service (Python / FastAPI) — 7 endpoints

#### `GET /api/v1/recommendations` — getRecommendations 🔒

Gợi ý bài hát cho user.

- **Params:** limit (default 20), seed (mixed/genre/artist/recent)
- **Response:** `RecommendationResponse { tracks: RecommendedTrack[], generatedAt, expiresAt, algorithm }`
- **Logic:**
  1. Redis GET `recs:{userId}` → cache hit: return.
  2. Cache miss → Neo4j Cypher:
     ```cypher
     MATCH (me:User {id: $userId})-[:LISTENED]->(t)<-[:LISTENED]-(other)
           -[:LISTENED]->(rec:Track)
     WHERE NOT (me)-[:LISTENED]->(rec) AND me <> other
     WITH rec, COUNT(DISTINCT other) AS score
     ORDER BY score DESC LIMIT $limit
     RETURN rec {.id, .title, .genre, .coverUrl, .playCount}, score
     ```
  3. Nếu seed == "genre": boost tracks matching user's top genres (thêm genre graph traversal).
  4. Nếu kết quả < limit (cold start): fallback scikit-learn content-based (popular tracks in user's preferred genres).
  5. Set `algorithm` field: "collaborative_filtering", "content_based", hoặc "hybrid".
  6. Build `reason` cho mỗi track: "Because Alice and Bob also liked this".
  7. Redis SET `recs:{userId}` TTL 30 phút.
- **Data flow:** Redis → (miss) Neo4j → (cold start fallback) scikit-learn → Redis cache.

#### `GET /api/v1/recommendations/discover-weekly` — getDiscoverWeekly 🔒

Playlist gợi ý hàng tuần.

- **Logic:**
  1. Redis GET `discover-weekly:{userId}` (TTL 7 ngày, regenerate weekly).
  2. Cache miss: Neo4j GDS `nodeSimilarity` → tìm similar users → lấy tracks họ nghe mà user chưa nghe.
  3. Filter: chỉ lấy tracks từ tuần trước (fresh content).
  4. Limit 30 tracks.

#### `GET /api/v1/recommendations/similar/{trackId}` — getSimilarTracks

Tracks tương tự (không cần auth).

- **Params:** limit (default 10)
- **Logic:**
  1. Neo4j: `MATCH (seed:Track {id: $trackId})<-[:LISTENED]-(u)-[:LISTENED]->(similar) WHERE seed <> similar` → co-listen pattern.
  2. Boost: `MATCH (seed)-[:IN_GENRE]->(g)<-[:IN_GENRE]-(similar)` → genre overlap.
  3. Score = coListenScore + genreMatch * 2.

#### `GET /api/v1/recommendations/radio/{trackId}` — getTrackRadio 🔒

Radio mode — endless queue từ seed track.

- **Logic:**
  1. Start từ seed track → expand qua genre graph + co-listen graph.
  2. Neo4j variable-length path: `MATCH (seed)-[:IN_GENRE]->()<-[:IN_GENRE]-(rec)`.
  3. Filter out tracks user đã nghe gần đây.
  4. Shuffle results cho variety.
  5. Return 25 tracks.

#### `GET /api/v1/taste-profile` — getTasteProfile 🔒

Xem taste profile.

- **Response:** `TasteProfile { userId, genreWeights, topArtists[], totalPlays, totalListeningMs, profileStrength }`
- **Logic:**
  1. Neo4j aggregate: `MATCH (me:User {id: $userId})-[r:LISTENED]->(t:Track)-[:IN_GENRE]->(g:Genre) RETURN g.name, SUM(r.times) AS count`.
  2. Normalize thành weights (0.0-1.0).
  3. Top artists: `MATCH (me)-[r:LISTENED]->(t)-[:BY]->(a:Artist) RETURN a, SUM(r.times) ORDER BY SUM DESC LIMIT 10`.
  4. profileStrength: WEAK (<20 plays), MODERATE (20-100), STRONG (>100).

#### `POST /api/v1/taste-profile/refresh` — refreshTasteProfile 🔒

Force rebuild taste profile. Trigger recalculation.

- **Response:** 202 `{ message, estimatedMs }`
- **Logic:** Invalidate Redis cache `recs:{userId}` + `discover-weekly:{userId}`. Neo4j recalculate on next query (lazy). Hoặc trigger background task.

#### `POST /api/v1/recommendations/feedback` — submitFeedback 🔒

User like/dislike/skip/save recommendation.

- **Request:** `RecommendationFeedback { trackId, action, context }`
- **Logic:**
  1. Neo4j: nếu action == LIKE hoặc SAVE_TO_PLAYLIST:
     - `MERGE (me)-[:SAVED]->(track)` — tăng weight cho future recommendations.
  2. Nếu action == DISLIKE:
     - `MERGE (me)-[:DISLIKED]->(track)` — exclude từ future recommendations.
  3. Invalidate cached recommendations.
- **Data flow:** Client → Neo4j (update graph) → Redis (invalidate cache).

### Event consumer (background)

- **TrackPlayedEvent** (từ Streaming via RabbitMQ):
  ```python
  async def handle_track_played(event):
      await neo4j_session.run("""
          MERGE (u:User {id: $userId})
          MERGE (t:Track {id: $trackId})
          ON CREATE SET t.title=$title, t.genre=$genre, ...
          MERGE (u)-[r:LISTENED]->(t)
          ON CREATE SET r.times=1, r.totalMs=$durationMs
          ON MATCH SET r.times=r.times+1, r.totalMs=r.totalMs+$durationMs
          MERGE (g:Genre {name: $genre})
          MERGE (t)-[:IN_GENRE]->(g)
          MERGE (a:Artist {id: $artistId})
          MERGE (t)-[:BY]->(a)
      """, **event.data)
  ```
  Mỗi play = 1 edge mới hoặc update edge weight. Recommendation queries phản ánh ngay.

- **TrackPublishedEvent** (từ Catalog): MERGE Track + Genre + Artist nodes nếu chưa tồn tại.
- **UserFollowedEvent** (từ User): `MERGE (a)-[:FOLLOWS]->(b)` — có thể dùng cho social recommendation.

---

## 9. Gateway (Go) — routing + cross-cutting

Gateway không có business logic. Routing config:

| Prefix | Target service | Auth | Notes |
|---|---|---|---|
| `/api/v1/auth/*` | User :8081 | Không | Public |
| `/api/v1/users/*` | User :8081 | Tùy endpoint | /me cần auth |
| `/api/v1/tracks/*` | Catalog :8082 | Tùy | GET public |
| `/api/v1/albums/*` | Catalog :8082 | Tùy | GET public |
| `/api/v1/artists/*` | Catalog :8082 | Tùy | GET public |
| `/api/v1/playlists/*` | Playlist :8083 | Tùy | Public playlists |
| `/api/v1/stream/*` | Streaming :8084 | Có | Range requests |
| `/api/v1/play-sessions/*` | Streaming :8084 | Có | |
| `/api/v1/history/*` | Streaming :8084 | Có | |
| `/api/v1/search/*` | Search :8085 | Không | Public |
| `/api/v1/upload/*` | Upload :8086 | Có (ARTIST) | |
| `/api/v1/notifications/*` | Notification :8087 | Có | |
| `/api/v1/recommendations/*` | Recommend :8000 | Tùy | similar public |
| `/api/v1/taste-profile/*` | Recommend :8000 | Có | |
| `/ws` | Notification :8087 | Token in query | WebSocket |

**Cross-cutting logic cần code trong Gateway:**

1. **JWT validation:** Parse Authorization header → verify signature → extract userId, role → forward as `X-User-Id`, `X-User-Role` headers.
2. **Rate limiting:** Redis sliding window. Key `ratelimit:{ip}:{path}`. Limits: 100 req/min general, 10 req/min cho upload, 1000 req/min cho stream.
3. **CORS:** Allow origins: localhost:3000 (dev), production domain.
4. **Request logging:** Structured JSON log mỗi request (method, path, status, latency, userId).
5. **Health check:** `GET /health` → ping tất cả downstream services, trả aggregate status.
6. **Prometheus metrics:** `GET /metrics` → request count, latency histogram, error rate.

---

## Tổng kết

| Service | Ngôn ngữ | Endpoints | Database | Vai trò chính |
|---|---|---|---|---|
| User | Java | 18 | PostgreSQL | Auth, profile, social |
| Catalog | Java | 16 | PostgreSQL + (ES via events) | Track/album/artist CRUD, CQRS write |
| Playlist | Java | 12 | PostgreSQL | DDD Aggregate, collaboration |
| Streaming | Go | 8 | PostgreSQL + Redis + MinIO | Audio serve, play tracking |
| Upload | Go | 5 | PostgreSQL + MinIO | Upload saga, FFmpeg transcode |
| Search | TypeScript | 4 | Elasticsearch | Full-text search, CQRS read |
| Notification | TypeScript | 7 | MongoDB + Redis | Push/email, TTL, WebSocket |
| Recommend | Python | 7 | Neo4j + Redis | Graph recommendation, GDS |
| Gateway | Go | Routing | Redis | JWT, rate limit, proxy |

Tổng: **77 endpoints** (69 business + 8 gateway routing + health/metrics).
