# API Endpoints Frontend Guide — v2

> Tài liệu chính xác dựa trên source code hiện tại của tất cả services.  
> Dùng để xây dựng frontend client.

---

## Quy ước chung

**Authentication:** Endpoints có icon 🔒 yêu cầu `Authorization: Bearer {accessToken}` trong header.

**Pagination response format:**
```json
{
  "content": [...],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```
Query params: `page` (0-based), `size` (default 20, max 100).

**Error format:**
```json
{
  "timestamp": "2026-06-10T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "path": "/api/v1/..."
}
```

**IDs:** UUID v4 dạng string.  
**Timestamps:** ISO-8601 UTC.  
**Internal endpoints** (`/api/v1/internal/`): chỉ dùng cho inter-service calls, không gọi từ frontend.

---

## 1. User Service — Port 8081

### 1.1 Auth (Public)

#### `POST /api/v1/auth/register`
Đăng ký tài khoản.

```
Request: {
  email: string
  password: string          // min 8 ký tự
  displayName: string       // max 100 ký tự
}

Response 201: {
  accessToken: string
  refreshToken: string
  expiresIn: number         // seconds
  tokenType: "Bearer"
  user: UserProfileDto
}
```

Errors: `409` email đã tồn tại · `400` password < 8 ký tự

---

#### `POST /api/v1/auth/login`
Đăng nhập.

```
Request: {
  email: string
  password: string
}

Response 200: AuthResponse (same as register)
```

Errors: `401` sai email hoặc password

---

#### `POST /api/v1/auth/refresh`
Làm mới access token.

```
Request: {
  refreshToken: string
}

Response 200: AuthResponse
```

Errors: `401` token không hợp lệ / đã revoke / hết hạn

---

#### `POST /api/v1/auth/logout`
Revoke refresh token.

```
Request: {
  refreshToken: string
}

Response: 204 No Content
```

---

#### `POST /api/v1/auth/oauth2/google`
Đăng nhập / đăng ký qua Google.

```
Request: {
  idToken: string           // Google ID token
}

Response 200: AuthResponse
```

---

### 1.2 Profile

#### `GET /api/v1/users/me` 🔒
Profile của user đang đăng nhập.

```
Response 200: UserProfileDto {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  role: "USER" | "ADMIN"
  followerCount: number
  followingCount: number
  createdAt: string
}
```

---

#### `PATCH /api/v1/users/me` 🔒
Cập nhật profile.

```
Request: {
  displayName?: string      // max 100 ký tự
  bio?: string
}

Response 200: UserProfileDto
```

---

#### `PUT /api/v1/users/me/avatar` 🔒
Upload ảnh đại diện.

```
Request: multipart/form-data
  file: File (JPG/PNG, max 5MB)

Response 200: {
  avatarUrl: string
}
```

---

#### `PUT /api/v1/users/me/password` 🔒
Đổi mật khẩu.

```
Request: {
  currentPassword: string
  newPassword: string       // min 8 ký tự
}

Response: 204 No Content
```

Errors: `400` mật khẩu hiện tại sai

---

#### `GET /api/v1/users/{userId}`
Profile public của user khác.

```
Response 200: PublicUserProfileDto {
  id: string
  displayName: string
  avatarUrl: string | null
  role: "USER" | "ADMIN"
  followerCount: number
  followingCount: number
  isFollowing: boolean      // false nếu chưa đăng nhập
}
```

---

#### `POST /api/v1/users/{userId}/follow` 🔒
Follow user.

```
Response: 204 No Content
```

Errors: `409` đã follow

---

#### `DELETE /api/v1/users/{userId}/follow` 🔒
Unfollow user.

```
Response: 204 No Content
```

---

#### `GET /api/v1/users/{userId}/followers`
Danh sách followers, paginated.

```
Query: page?, size?

Response 200: PaginatedResponse<UserProfileDto>
```

---

#### `GET /api/v1/users/{userId}/following`
Danh sách đang follow, paginated.

```
Query: page?, size?

Response 200: PaginatedResponse<UserProfileDto>
```

---

### 1.3 Admin 🔒 (role ADMIN)

#### `GET /api/v1/admin/users`
Danh sách users, có filter + search.

```
Query:
  role?: "USER" | "ADMIN"
  search?: string           // tìm theo displayName / email
  page?: number
  size?: number

Response 200: PaginatedResponse<UserProfileDto>
```

---

#### `PUT /api/v1/admin/users/{userId}/role`
Đổi role user.

```
Request: {
  role: "USER" | "ADMIN"
}

Response 200: UserProfileDto
```

---

## 2. Catalog Service — Port 8082

### 2.1 Tracks

#### `GET /api/v1/tracks`
Browse tracks, paginated + filterable.

```
Query:
  genre?: string
  artistId?: string
  albumId?: string
  sort?: "newest" | "oldest" | "popular" | "title_asc" | "title_desc"
  page?: number
  size?: number

Response 200: PaginatedResponse<TrackSummaryDto>
```

```
TrackSummaryDto {
  id: string
  title: string
  durationMs: number
  genre: string | null
  coverUrl: string | null
  playCount: number
  status: "PUBLISHED" | "ARCHIVED"
  releaseDate: string | null
  artist: {
    id: string
    name: string
    avatarUrl: string | null
  }
}
```

---

#### `GET /api/v1/tracks/popular`
Top tracks phổ biến (cached 5 phút).

```
Query:
  limit?: number            // max 50, default 20
  genre?: string
  period?: "day" | "week" | "month" | "all"   // default "all"

Response 200: TrackSummaryDto[]
```

---

#### `GET /api/v1/tracks/new-releases`
Tracks mới phát hành (cached 5 phút).

```
Query:
  limit?: number            // default 20

Response 200: TrackSummaryDto[]
```

---

#### `GET /api/v1/tracks/{trackId}`
Chi tiết track.

```
Response 200: TrackDetailDto {
  id: string
  title: string
  durationMs: number
  genre: string | null
  coverUrl: string | null
  waveformUrl: string | null
  playCount: number
  status: "PUBLISHED" | "ARCHIVED"
  releaseDate: string | null
  createdAt: string
  updatedAt: string
  artist: {
    id: string
    name: string
    avatarUrl: string | null
  }
  album: {
    id: string
    title: string
    coverUrl: string | null
  } | null
  assets: AudioAssetDto[]
}

AudioAssetDto {
  bitrate: number           // 128 | 256 | 320
  format: string            // "mp3"
  storageUrl: string
  sizeBytes: number
}
```

Errors: `404`

---

#### `PUT /api/v1/tracks/{trackId}` 🔒
Cập nhật metadata track (owner hoặc ADMIN).

```
Request: {
  title?: string
  genre?: string
  albumId?: string | null
  releaseDate?: string      // ISO date
}

Response 200: TrackDetailDto
```

Errors: `403` không phải owner

---

#### `DELETE /api/v1/tracks/{trackId}` 🔒
Soft delete track (status → ARCHIVED).

```
Response: 204 No Content
```

---

### 2.2 Albums

#### `GET /api/v1/albums`
Browse albums, paginated.

```
Query:
  artistId?: string
  page?: number
  size?: number

Response 200: PaginatedResponse<AlbumSummaryDto>
```

```
AlbumSummaryDto {
  id: string
  title: string
  coverUrl: string | null
  releaseDate: string | null
  artist: {
    id: string
    name: string
    avatarUrl: string | null
  }
}
```

---

#### `POST /api/v1/albums` 🔒 (ARTIST)
Tạo album.

```
Request: {
  title: string             // max 255 ký tự
  releaseDate?: string      // ISO date
  coverUrl?: string
}

Response 201: AlbumSummaryDto
```

---

#### `GET /api/v1/albums/{albumId}`
Chi tiết album + danh sách tracks.

```
Response 200: AlbumDetailDto {
  id: string
  title: string
  coverUrl: string | null
  releaseDate: string | null
  createdAt: string
  totalDurationMs: number
  artist: {
    id: string
    name: string
    avatarUrl: string | null
  }
  tracks: TrackSummaryDto[]
}
```

---

#### `PUT /api/v1/albums/{albumId}` 🔒
Cập nhật album (owner hoặc ADMIN).

```
Request: {
  title?: string
  coverUrl?: string
  releaseDate?: string
}

Response 200: AlbumSummaryDto
```

---

### 2.3 Artists

#### `GET /api/v1/artists`
Browse artists, paginated.

```
Query: page?, size?

Response 200: PaginatedResponse<ArtistSummaryDto>
```

```
ArtistSummaryDto {
  id: string
  name: string
  avatarUrl: string | null
  trackCount: number
  albumCount: number
}
```

---

#### `GET /api/v1/artists/{artistId}`
Profile artist + top tracks + albums.

```
Response 200: ArtistDetailDto {
  id: string
  name: string
  bio: string | null
  avatarUrl: string | null
  userId: string
  trackCount: number
  albumCount: number
  createdAt: string
  topTracks: TrackSummaryDto[]    // top 10 by play_count
  albums: AlbumSummaryDto[]
}
```

---

#### `PUT /api/v1/artists/{artistId}` 🔒
Cập nhật artist profile (owner).

```
Request: {
  name?: string
  bio?: string
  avatarUrl?: string
}

Response 200: ArtistSummaryDto
```

---

## 3. Playlist Service — Port 8083

### 3.1 Playlist CRUD

#### `GET /api/v1/playlists` 🔒
Playlists của user hiện tại (owned + collaborating).

```
Query: page?, size?

Response 200: PaginatedResponse<PlaylistSummaryDto>
```

```
PlaylistSummaryDto {
  id: string
  ownerId: string
  name: string
  description: string | null
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED"
  trackCount: number
  totalDurationMs: number
  createdAt: string
  updatedAt: string
}
```

---

#### `POST /api/v1/playlists` 🔒
Tạo playlist.

```
Request: {
  name: string              // 1-100 ký tự
  description?: string
  visibility?: "PRIVATE" | "PUBLIC" | "UNLISTED"   // default PRIVATE
}

Response 201: PlaylistDetailDto
```

---

#### `GET /api/v1/playlists/{playlistId}`
Chi tiết playlist.

```
Response 200: PlaylistDetailDto {
  id: string
  ownerId: string
  name: string
  description: string | null
  visibility: "PRIVATE" | "PUBLIC" | "UNLISTED"
  trackCount: number
  totalDurationMs: number
  createdAt: string
  updatedAt: string
  isOwner: boolean
  canEdit: boolean
  items: PlaylistItemDto[]
  collaborators: CollaboratorDto[]
}

PlaylistItemDto {
  id: string
  trackId: string
  position: number
  addedBy: string           // userId
  addedAt: string
  trackTitle: string
  trackDuration: number     // ms
  trackCoverUrl: string | null
  artistName: string
}

CollaboratorDto {
  id: string
  userId: string
  role: "EDITOR" | "VIEWER"
  joinedAt: string
  displayName: string
  avatarUrl: string | null
}
```

Errors: `403` PRIVATE playlist không có quyền · `404`

---

#### `PATCH /api/v1/playlists/{playlistId}` 🔒
Cập nhật playlist (chỉ owner).

```
Request: {
  name?: string             // 1-100 ký tự
  description?: string
  visibility?: "PRIVATE" | "PUBLIC" | "UNLISTED"
}

Response 200: PlaylistDetailDto
```

---

#### `DELETE /api/v1/playlists/{playlistId}` 🔒
Xóa playlist (chỉ owner).

```
Response: 204 No Content
```

---

### 3.2 Items

#### `POST /api/v1/playlists/{playlistId}/items` 🔒
Thêm track vào playlist.

```
Request: {
  trackId: string
  position?: number         // null = append cuối
}

Response 201: PlaylistItemDto
```

Errors: `400` playlist đầy (>1000 tracks) · `400` track đã có · `403` không có quyền edit · `404` track không tồn tại

---

#### `DELETE /api/v1/playlists/{playlistId}/items/{itemId}` 🔒
Xóa track khỏi playlist.

```
Response: 204 No Content
```

---

#### `PUT /api/v1/playlists/{playlistId}/items/reorder` 🔒
Sắp xếp lại thứ tự (chỉ owner + EDITOR).

```
Request: {
  itemIds: string[]         // toàn bộ item IDs theo thứ tự mới
}

Response: 204 No Content
```

---

### 3.3 Collaborators

#### `GET /api/v1/playlists/{playlistId}/collaborators`
Danh sách collaborators.

```
Response 200: CollaboratorDto[]
```

---

#### `POST /api/v1/playlists/{playlistId}/collaborators` 🔒
Thêm collaborator (chỉ owner).

```
Request: {
  userId: string
  role: "EDITOR" | "VIEWER"
}

Response 201: CollaboratorDto
```

---

#### `DELETE /api/v1/playlists/{playlistId}/collaborators/{userId}` 🔒
Xóa collaborator (owner hoặc tự rời).

```
Response: 204 No Content
```

---

#### `GET /api/v1/users/{userId}/playlists`
Playlists PUBLIC của user bất kỳ.

```
Query: page?, size?

Response 200: PaginatedResponse<PlaylistSummaryDto>
```

---

## 4. Streaming Service — Port 8084

### 4.1 Audio Streaming

#### `GET /api/v1/stream/{trackId}` 🔒
Stream audio file (HTTP Range Requests).

```
Query:
  bitrate?: 128 | 256 | 320   // default 320

Headers:
  Range: bytes=0-1048575      // optional, cho seek

Response 200 / 206 Partial Content:
  Content-Type: audio/mpeg
  Content-Range: bytes 0-1048575/total
  Accept-Ranges: bytes
  Body: audio data
```

---

#### `GET /api/v1/stream/{trackId}/hls` 🔒
HLS master playlist (.m3u8) cho adaptive bitrate.

```
Response 200:
  Content-Type: application/vnd.apple.mpegurl
  Body: .m3u8 playlist
```

---

### 4.2 Play Sessions

#### `POST /api/v1/play-sessions` 🔒
Bắt đầu phiên nghe (gọi khi user bấm Play).

```
Request: {
  trackId: string
  bitrate?: 128 | 256 | 320
  source?: string           // "search" | "recommendation" | "playlist" | ...
}

Response 201: PlaySessionDto {
  id: string
  userId: string
  trackId: string
  startedAt: string
  positionMs: number
  durationMs: number
  completed: boolean
  status: "PLAYING"
  source: string | null
  bitrate: number | null
}
```

---

#### `POST /api/v1/play-sessions/{sessionId}/heartbeat` 🔒
Cập nhật vị trí nghe (gửi mỗi 10-15 giây).

```
Request: {
  positionMs: number
}

Response 200: PlaySessionDto (updated)
```

---

#### `POST /api/v1/play-sessions/{sessionId}/end` 🔒
Kết thúc phiên nghe.

```
Request: {
  positionMs: number
  reason?: "COMPLETED" | "SKIPPED" | "PAUSED_TIMEOUT" | "ERROR"
}

Response 200: PlaySessionDto {
  ...
  status: "ENDED"
  endedAt: string
  endReason: string | null
}
```

---

### 4.3 Play History

#### `GET /api/v1/history` 🔒
Lịch sử nghe, paginated.

```
Query: page?, size?

Response 200: PaginatedResponse<PlayHistoryEntry>

PlayHistoryEntry {
  trackId: string
  trackTitle: string
  artistName: string
  coverUrl: string | null
  playedAt: string
  listenedMs: number
  endedAt: string | null
}
```

---

#### `GET /api/v1/history/recently-played` 🔒
Tracks nghe gần đây, unique.

```
Response 200: {
  items: PlayHistoryEntry[]
}
```

---

#### `GET /api/v1/history/stats` 🔒
Thống kê nghe nhạc.

```
Response 200: ListeningStats {
  totalListeningMs: number
  totalTracks: number
  totalSessions: number
  topGenres: { genre: string, count: number }[]
  topArtists: { artistId: string, name: string, count: number }[]
}
```

---

## 5. Upload Service — Port 8086

> Upload theo flow **Draft → Add tracks → Upload audio → Submit**.  
> Đây là flow khác hoàn toàn so với v1.

### 5.1 Drafts

#### `POST /api/v1/upload/drafts` 🔒 (ARTIST)
Tạo draft upload mới.

```
Request: multipart/form-data {
  title: string
  release_type?: string     // default "single"
  genre?: string
  thumbnail?: File          // max 10MB
}

Response 201: DraftDto {
  id: string
  title: string
  releaseType: string
  genre: string | null
  thumbnailUrl: string | null
  status: string
  tracks: TrackDraftDto[]
  createdAt: string
}
```

---

#### `GET /api/v1/upload/drafts/{draftId}` 🔒
Chi tiết draft.

```
Response 200: DraftDto
```

---

#### `POST /api/v1/upload/drafts/{draftId}/tracks` 🔒
Thêm track vào draft.

```
Request: {
  title: string
  trackNumber: number
}

Response 201: TrackDraftDto {
  id: string
  title: string
  trackNumber: number
  status: string
  audioConfirmed: boolean
}
```

---

#### `DELETE /api/v1/upload/drafts/{draftId}/tracks/{trackId}` 🔒
Xóa track khỏi draft.

```
Response: 204 No Content
```

---

#### `GET /api/v1/upload/drafts/{draftId}/tracks/{trackId}/audio-url` 🔒
Lấy presigned URL để upload audio trực tiếp lên MinIO.

```
Query:
  filename: string          // required, e.g. "song.mp3"

Response 200: {
  uploadUrl: string         // presigned PUT URL
  objectKey: string         // dùng cho bước confirm
}
```

---

#### `POST /api/v1/upload/drafts/{draftId}/tracks/{trackId}/confirm` 🔒
Xác nhận đã upload audio xong.

```
Request: {
  objectKey: string         // từ bước lấy audio-url
}

Response 200: DraftDto (updated)
```

---

#### `POST /api/v1/upload/drafts/{draftId}/submit` 🔒
Submit draft → bắt đầu transcode.

```
Response 202: UploadJobDto[]
```

---

#### `POST /api/v1/upload/drafts/{draftId}/cancel` 🔒
Hủy draft.

```
Response: 204 No Content
```

---

### 5.2 Jobs

#### `GET /api/v1/upload/jobs` 🔒
Danh sách upload jobs.

```
Query:
  page?: number             // 1-based (min 1), default 1
  size?: number             // default 20, max 100
  status?: string           // filter by status

Response 200: PaginatedResponse<UploadJobDto>
```

```
UploadJobDto {
  id: string
  draftId: string
  trackTitle: string
  status: "PENDING" | "TRANSCODING" | "COMPLETED" | "FAILED" | "CANCELLED"
  createdAt: string
  updatedAt: string
}
```

---

#### `GET /api/v1/upload/jobs/{jobId}` 🔒
Chi tiết job + tasks.

```
Response 200: UploadJobDetailDto {
  ...UploadJobDto
  originalSizeBytes: number | null
  originalFormat: string | null
  tasks: TranscodeTaskDto[]
}

TranscodeTaskDto {
  id: string
  bitrate: 128 | 256 | 320
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
  errorMessage: string | null
}
```

---

#### `POST /api/v1/upload/jobs/{jobId}/retry` 🔒
Retry job bị FAILED.

```
Response 202: UploadJobDto (updated)
```

---

#### `POST /api/v1/upload/jobs/{jobId}/cancel` 🔒
Hủy job đang xử lý.

```
Response 200: UploadJobDto (updated)
```

---

## 6. Search Service — Port 8085

> Tất cả search endpoints đều **public**, không cần auth.

#### `GET /api/v1/search`
Tìm kiếm tổng hợp (tracks + artists).

```
Query:
  q: string                 // required
  type?: ("track" | "artist")[]
  genre?: string
  page?: number
  size?: number

Response 200: UnifiedSearchResponse {
  tracks: {
    items: SearchTrackHit[]
    total: number
  }
  artists: {
    items: SearchArtistHit[]
    total: number
  }
  totalResults: number
  queryTimeMs: number
}
```

---

#### `GET /api/v1/search/tracks`
Tìm kiếm chỉ tracks.

```
Query:
  q: string                 // required
  genre?: string
  artistId?: string
  sort?: "relevance" | "newest" | "popular" | "title"   // default "relevance"
  page?: number
  size?: number

Response 200: PagedResponse<SearchTrackHit> + queryTimeMs

SearchTrackHit {
  id: string
  title: string
  genre: string | null
  durationMs: number
  coverUrl: string | null
  playCount: number
  artist: { id: string, name: string }
  album: { id: string, title: string } | null
  score: number
}
```

---

#### `GET /api/v1/search/artists`
Tìm kiếm artists.

```
Query:
  q: string                 // required
  page?: number
  size?: number

Response 200: PagedResponse<SearchArtistHit>

SearchArtistHit {
  id: string
  name: string
  avatarUrl: string | null
  trackCount: number
  genreTags: string[]
  score: number
}
```

---

#### `GET /api/v1/search/autocomplete`
Gợi ý khi gõ.

```
Query:
  q: string                 // required, min 1 ký tự
  limit?: number            // default 5, max 20

Response 200: {
  suggestions: AutocompleteSuggestion[]
}

AutocompleteSuggestion {
  text: string
  type: "track" | "artist"
  id: string
  imageUrl: string | null
}
```

---

## 7. Notification Service — Port 8087

### 7.1 Notifications

#### `GET /api/v1/notifications` 🔒
Danh sách notifications, paginated.

```
Query:
  unreadOnly?: boolean      // default false
  type?: NotificationType
  page?: number
  size?: number             // max 50

Response 200: PaginatedNotificationsDto {
  content: NotificationDto[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  unreadCount: number
}

NotificationDto {
  id: string
  type: NotificationType
  title: string
  body: string
  data: object | null       // extra context (trackId, userId, etc.)
  read: boolean
  createdAt: string
}
```

**NotificationType values:** `NEW_FOLLOWER` · `PLAYLIST_SHARED` · `COLLABORATOR_ADDED` · `PLAYLIST_TRACK_ADDED` · `NEW_RELEASE` · `TRANSCODE_FAILED`

---

#### `GET /api/v1/notifications/unread-count` 🔒
Số notification chưa đọc (cho badge UI).

```
Response 200: {
  count: number
}
```

---

#### `POST /api/v1/notifications/{id}/read` 🔒
Đánh dấu một notification đã đọc.

```
Response: 204 No Content
```

---

#### `POST /api/v1/notifications/read-all` 🔒
Đánh dấu tất cả đã đọc.

```
Response: 204 No Content
```

---

### 7.2 Preferences

#### `GET /api/v1/notifications/preferences` 🔒
Cài đặt notification.

```
Response 200: PreferencesDto {
  emailEnabled: boolean
  pushEnabled: boolean
  newFollower: boolean
  playlistShared: boolean
  newRelease: boolean
  collaboratorActivity: boolean
}
```

---

#### `PUT /api/v1/notifications/preferences` 🔒
Cập nhật cài đặt.

```
Request: {
  emailEnabled?: boolean
  pushEnabled?: boolean
  newFollower?: boolean
  playlistShared?: boolean
  newRelease?: boolean
  collaboratorActivity?: boolean
}

Response 200: PreferencesDto (updated)
```

---

### 7.3 WebSocket

#### `WS /ws?token={accessToken}`
Kết nối realtime để nhận notification push.

```
Connection: ws://host:8087/ws?token={accessToken}

Server → Client messages:
  { type: "notification", payload: NotificationDto }

Client → Server messages:
  { type: "ack", notificationId: string }   // markAsRead
  { type: "ping" }                           // keepalive → server replies "pong"
```

---

## 8. Recommend Service — Port 8000

### 8.1 Recommendations

#### `GET /api/v1/recommendations` 🔒
Gợi ý bài hát cho user (cached 30 phút).

```
Query:
  limit?: number            // default 20, max 100
  genre?: string
  seed?: "mixed" | "genre" | "artist" | "recent"

Response 200: RecommendationsResponse {
  items: TrackRecItem[]
  total: number
  generatedAt: string
  expiresAt: string
  algorithm: "collaborative_filtering" | "content_based" | "hybrid"
}

TrackRecItem {
  trackId: string
  title: string
  genre: string | null
  coverUrl: string | null
  playCount: number
  score: number
  reason: string            // "Because Alice and Bob also liked this"
}
```

---

#### `GET /api/v1/recommendations/discover-weekly` 🔒
Playlist gợi ý hàng tuần (cached 7 ngày).

```
Response 200: DiscoverWeeklyResponse {
  playlistId: string | null
  title: string
  description: string
  items: TrackRecItem[]
  total: number
  generatedAt: string
  refreshesAt: string
}
```

---

#### `GET /api/v1/recommendations/similar/{trackId}`
Tracks tương tự (public, không cần auth).

```
Query:
  limit?: number            // default 10, max 50

Response 200: SimilarTracksResponse {
  sourceTrackId: string
  items: TrackRecItem[]
  total: number
}
```

---

#### `GET /api/v1/recommendations/radio/{trackId}` 🔒
Radio mode — queue từ seed track.

```
Query:
  limit?: number            // default 25, max 50

Response 200: RadioResponse {
  seedTrackId: string
  items: TrackRecItem[]
  total: number
}
```

---

#### `POST /api/v1/recommendations/feedback` 🔒
Phản hồi về recommendation.

```
Request: {
  trackId: string
  action: "LIKE" | "DISLIKE" | "SKIP" | "SAVE_TO_PLAYLIST"
  context?: string
}

Response 202: {
  success: true
  feedbackId: string
}
```

---

### 8.2 Taste Profile

#### `GET /api/v1/taste-profile` 🔒
Taste profile của user.

```
Response 200: TasteProfileResponse {
  userId: string
  genreWeights: { genre: string, weight: number }[]    // 0.0-1.0
  topArtists: { artistId: string, name: string, playCount: number }[]
  totalPlays: number
  totalListeningMs: number
  profileStrength: "WEAK" | "MODERATE" | "STRONG"
  updatedAt: string
}
```

---

#### `POST /api/v1/taste-profile/refresh` 🔒
Force rebuild taste profile.

```
Response 202: {
  message: string
  estimatedMs: number
}
```

---

## 9. Gateway — Port 8080

Gateway không có business logic, chỉ route + cross-cutting:

| Prefix | Service | Auth |
|---|---|---|
| `/api/v1/auth/*` | User :8081 | Public |
| `/api/v1/users/*` | User :8081 | Tùy endpoint |
| `/api/v1/tracks/*` | Catalog :8082 | GET public |
| `/api/v1/albums/*` | Catalog :8082 | GET public |
| `/api/v1/artists/*` | Catalog :8082 | GET public |
| `/api/v1/playlists/*` | Playlist :8083 | Tùy endpoint |
| `/api/v1/stream/*` | Streaming :8084 | Có |
| `/api/v1/play-sessions/*` | Streaming :8084 | Có |
| `/api/v1/history/*` | Streaming :8084 | Có |
| `/api/v1/search/*` | Search :8085 | Public |
| `/api/v1/upload/*` | Upload :8086 | Có (ARTIST) |
| `/api/v1/notifications/*` | Notification :8087 | Có |
| `/api/v1/recommendations/*` | Recommend :8000 | Tùy endpoint |
| `/api/v1/taste-profile/*` | Recommend :8000 | Có |
| `/ws` | Notification :8087 | Token in query |

---

## Tóm tắt thay đổi so với v1

| Điểm thay đổi | v1 | v2 |
|---|---|---|
| User roles | `LISTENER`, `ARTIST` | `USER`, `ADMIN` |
| Upload flow | Direct upload + Saga tự động | Draft → Add tracks → Presigned URL → Confirm → Submit |
| Upload endpoints | 5 endpoints (`/upload`, `/upload/jobs/*`) | 12 endpoints (`/upload/drafts/*`, `/upload/jobs/*`) |
| Search service | Fastify | NestJS |
| Notification type filter | Có filter | Có filter với enum rõ ràng |
| Streaming pagination | Custom | `page`/`size` standard |
| Upload pagination | 0-based page | 1-based page (min 1) |
