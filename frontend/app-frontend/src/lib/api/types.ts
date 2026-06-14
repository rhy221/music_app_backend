export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserProfileDto {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface PublicUserProfileDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserProfileDto;
}

export interface ArtistRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  userId: string | null;
}

export interface AlbumRef {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface TrackSummaryDto {
  id: string;
  title: string;
  durationMs: number;
  genre: string | null;
  coverUrl: string | null;
  playCount: number;
  status: 'PUBLISHED' | 'ARCHIVED';
  releaseDate: string | null;
  artist: ArtistRef;
}

export interface AudioAssetDto {
  bitrate: 128 | 256 | 320;
  format: string;
  storageUrl: string;
  sizeBytes: number;
}

export interface TrackDetailDto extends TrackSummaryDto {
  waveformUrl: string | null;
  createdAt: string;
  updatedAt: string;
  album: AlbumRef | null;
  assets: AudioAssetDto[];
}

export interface AlbumSummaryDto {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseDate: string | null;
  artist: ArtistRef;
}

export interface AlbumDetailDto extends AlbumSummaryDto {
  createdAt: string;
  totalDurationMs: number;
  tracks: TrackSummaryDto[];
}

export interface ArtistSummaryDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  trackCount: number;
  albumCount: number;
}

export interface ArtistDetailDto extends ArtistSummaryDto {
  bio: string | null;
  userId: string;
  createdAt: string;
  topTracks: TrackSummaryDto[];
  albums: AlbumSummaryDto[];
}

export interface PlaylistSummaryDto {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  visibility: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
  trackCount: number;
  totalDurationMs: number;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItemDto {
  id: string;
  trackId: string;
  position: number;
  addedBy: string;
  addedAt: string;
  trackTitle: string;
  trackDuration: number;
  trackCoverUrl: string | null;
  artistName: string;
  artistId: string | null;
  albumId: string | null;
  albumTitle: string | null;
  deleted: boolean;
}

export interface CollaboratorDto {
  id: string;
  userId: string;
  role: 'EDITOR' | 'VIEWER';
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PlaylistDetailDto extends PlaylistSummaryDto {
  isOwner: boolean;
  canEdit: boolean;
  items: PlaylistItemDto[];
  collaborators: CollaboratorDto[];
}

export interface PlaySessionDto {
  id: string;
  userId: string;
  trackId: string;
  startedAt: string;
  positionMs: number;
  durationMs: number;
  completed: boolean;
  status: 'PLAYING' | 'ENDED';
  source: string | null;
  bitrate: number | null;
  endedAt?: string;
  endReason?: string | null;
}

export interface PlayHistoryEntry {
  trackId: string;
  trackTitle: string;
  artistName: string;
  coverUrl: string | null;
  playedAt: string;
  listenedMs: number;
  endedAt: string | null;
}

export interface ListeningStats {
  totalListeningMs: number;
  totalTracks: number;
  totalSessions: number;
  topGenres: { genre: string; count: number }[];
  topArtists: { artistId: string; name: string; count: number }[];
}

export interface DraftDto {
  id: string;
  title: string;
  releaseType: string;
  genre: string | null;
  thumbnailUrl: string | null;
  releaseDate: string | null;
  status: string;
  tracks: TrackDraftDto[];
  createdAt: string;
}

export interface TrackDraftDto {
  id: string;
  title: string;
  trackNumber: number;
  status: string;
  audioConfirmed: boolean;
}

export interface UploadJobDto {
  id: string;
  draftId: string | null;
  trackTitle: string;
  status: 'UPLOADING' | 'TRANSCODING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
  originalFilename: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscodeTaskDto {
  id: string;
  bitrate: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
}

export interface UploadJobDetailDto extends UploadJobDto {
  originalSizeBytes: number | null;
  originalFormat: string | null;
  tasks: TranscodeTaskDto[];
}

export interface SearchTrackHit {
  id: string;
  title: string;
  genre: string | null;
  durationMs: number;
  coverUrl: string | null;
  playCount: number;
  artist: { id: string; name: string };
  album: { id: string; title: string } | null;
  score: number;
}

export interface SearchArtistHit {
  id: string;
  name: string;
  avatarUrl: string | null;
  trackCount: number;
  genreTags: string[];
  score: number;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'track' | 'artist';
  id: string;
  imageUrl: string | null;
}

export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'PLAYLIST_SHARED'
  | 'COLLABORATOR_ADDED'
  | 'PLAYLIST_TRACK_ADDED'
  | 'NEW_RELEASE'
  | 'TRANSCODE_FAILED';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface PaginatedNotificationsDto extends PaginatedResponse<NotificationDto> {
  unreadCount: number;
}

export interface PreferencesDto {
  emailEnabled: boolean;
  pushEnabled: boolean;
  newFollower: boolean;
  playlistShared: boolean;
  newRelease: boolean;
  collaboratorActivity: boolean;
}

export interface TrackRecItem {
  trackId: string;
  title: string;
  genre: string | null;
  coverUrl: string | null;
  playCount: number;
  score: number;
  reason: string;
}

export interface RecommendationsResponse {
  items: TrackRecItem[];
  total: number;
  generatedAt: string;
  expiresAt: string;
  algorithm: 'collaborative_filtering' | 'content_based' | 'hybrid';
}

export interface DiscoverWeeklyResponse {
  playlistId: string | null;
  title: string;
  description: string;
  items: TrackRecItem[];
  total: number;
  generatedAt: string;
  refreshesAt: string;
}

export interface TasteProfileResponse {
  userId: string;
  genreWeights: { genre: string; weight: number }[];
  topArtists: { artistId: string; name: string; playCount: number }[];
  totalPlays: number;
  totalListeningMs: number;
  profileStrength: 'WEAK' | 'MODERATE' | 'STRONG';
  updatedAt: string;
}
