package events

import "time"

// ─── Common header ────────────────────────────────────────────────────────────

type EventHeader struct {
	EventID       string    `json:"eventId"`
	EventType     string    `json:"eventType"`
	Timestamp     time.Time `json:"timestamp"`
	SourceService string    `json:"sourceService"`
	CorrelationID *string   `json:"correlationId,omitempty"`
}

// ─── Shared types ─────────────────────────────────────────────────────────────

type AudioFormat string

const (
	AudioFormatMP3  AudioFormat = "MP3"
	AudioFormatAAC  AudioFormat = "AAC"
	AudioFormatFLAC AudioFormat = "FLAC"
	AudioFormatOGG  AudioFormat = "OGG"
)

type AudioAsset struct {
	Bitrate    int         `json:"bitrate"`
	Format     AudioFormat `json:"format"`
	StorageURL string      `json:"storageUrl"`
	SizeBytes  int64       `json:"sizeBytes"`
}

type PlaySource string

const (
	PlaySourceBrowse         PlaySource = "BROWSE"
	PlaySourcePlaylist       PlaySource = "PLAYLIST"
	PlaySourceSearch         PlaySource = "SEARCH"
	PlaySourceRecommendation PlaySource = "RECOMMENDATION"
	PlaySourceAlbum          PlaySource = "ALBUM"
	PlaySourceArtist         PlaySource = "ARTIST"
)

// ─── Upload events ────────────────────────────────────────────────────────────

type TrackUploadedData struct {
	UploadJobID      string  `json:"uploadJobId"`
	UploaderID       string  `json:"uploaderId"`
	OriginalFilename string  `json:"originalFilename"`
	Title            string  `json:"title"`
	Genre            *string `json:"genre,omitempty"`
	StorageURL       string  `json:"storageUrl"`
	SizeBytes        int64   `json:"sizeBytes"`
}

type TrackUploadedEvent struct {
	Header EventHeader       `json:"header"`
	Data   TrackUploadedData `json:"data"`
}

type TranscodeCompletedData struct {
	UploadJobID  string       `json:"uploadJobId"`
	UploaderID   string       `json:"uploaderId"`
	Title        string       `json:"title"`
	Genre        *string      `json:"genre,omitempty"`
	AlbumID      *string      `json:"albumId,omitempty"`
	AlbumTitle   *string      `json:"albumTitle,omitempty"`
	ReleaseDate  *string      `json:"releaseDate,omitempty"`
	DurationMs   int          `json:"durationMs"`
	ThumbnailURL *string      `json:"thumbnailUrl,omitempty"`
	WaveformURL  *string      `json:"waveformUrl,omitempty"`
	Assets       []AudioAsset `json:"assets"`
}

type TranscodeCompletedEvent struct {
	Header EventHeader            `json:"header"`
	Data   TranscodeCompletedData `json:"data"`
}

type TranscodeFailedData struct {
	UploadJobID        string `json:"uploadJobId"`
	UploaderID         string `json:"uploaderId"`
	ErrorMessage       string `json:"errorMessage"`
	OriginalStorageURL string `json:"originalStorageUrl"`
}

type TranscodeFailedEvent struct {
	Header EventHeader         `json:"header"`
	Data   TranscodeFailedData `json:"data"`
}

// ─── Catalog events ───────────────────────────────────────────────────────────

type PublishedAsset struct {
	Bitrate    int    `json:"bitrate"`
	Format     string `json:"format"`
	StorageURL string `json:"storageUrl"`
}

type TrackPublishedData struct {
	TrackID     string           `json:"trackId"`
	UploadJobID *string          `json:"uploadJobId,omitempty"` // Saga correlation: Upload service uses this to update job status
	Title       string           `json:"title"`
	DurationMs  int              `json:"durationMs"`
	CoverURL    *string          `json:"coverUrl,omitempty"`
	Genre       string           `json:"genre"`
	ArtistID    string           `json:"artistId"`
	ArtistName  string           `json:"artistName"`
	AlbumID     *string          `json:"albumId,omitempty"`
	AlbumTitle  *string          `json:"albumTitle,omitempty"`
	Assets      []PublishedAsset `json:"assets"`
}

type TrackPublishedEvent struct {
	Header EventHeader        `json:"header"`
	Data   TrackPublishedData `json:"data"`
}

type TrackUpdatedData struct {
	TrackID    string  `json:"trackId"`
	Title      string  `json:"title"`
	Genre      string  `json:"genre"`
	CoverURL   *string `json:"coverUrl,omitempty"`
	ArtistName string  `json:"artistName"`
}

type TrackUpdatedEvent struct {
	Header EventHeader      `json:"header"`
	Data   TrackUpdatedData `json:"data"`
}

type TrackDeletedData struct {
	TrackID string `json:"trackId"`
}

type TrackDeletedEvent struct {
	Header EventHeader      `json:"header"`
	Data   TrackDeletedData `json:"data"`
}

// ─── Streaming events ─────────────────────────────────────────────────────────

type TrackPlayedData struct {
	UserID        string     `json:"userId"`
	TrackID       string     `json:"trackId"`
	Genre         string     `json:"genre"`
	ArtistID      string     `json:"artistId"`
	DurationMs    int        `json:"durationMs"`
	Source        PlaySource `json:"source"`
	CompletedFull bool       `json:"completedFull"`
	PlayedAt      time.Time  `json:"playedAt"`
}

type TrackPlayedEvent struct {
	Header EventHeader     `json:"header"`
	Data   TrackPlayedData `json:"data"`
}

// ─── User events ──────────────────────────────────────────────────────────────

type UserRegisteredData struct {
	UserID      string `json:"userId"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

type UserRegisteredEvent struct {
	Header EventHeader        `json:"header"`
	Data   UserRegisteredData `json:"data"`
}

type UserFollowedData struct {
	FollowerID   string `json:"followerId"`
	FollowerName string `json:"followerName"`
	FollowingID  string `json:"followingId"`
}

type UserFollowedEvent struct {
	Header EventHeader      `json:"header"`
	Data   UserFollowedData `json:"data"`
}

// ─── Playlist events ──────────────────────────────────────────────────────────

type PlaylistSharedData struct {
	PlaylistID       string `json:"playlistId"`
	PlaylistName     string `json:"playlistName"`
	OwnerID          string `json:"ownerId"`
	OwnerName        string `json:"ownerName"`
	SharedWithUserID string `json:"sharedWithUserId"`
}

type PlaylistSharedEvent struct {
	Header EventHeader        `json:"header"`
	Data   PlaylistSharedData `json:"data"`
}

type CollaboratorRole string

const (
	CollaboratorRoleEditor CollaboratorRole = "EDITOR"
	CollaboratorRoleViewer CollaboratorRole = "VIEWER"
)

type CollaboratorAddedData struct {
	PlaylistID     string           `json:"playlistId"`
	PlaylistName   string           `json:"playlistName"`
	OwnerID        string           `json:"ownerId"`
	CollaboratorID string           `json:"collaboratorId"`
	Role           CollaboratorRole `json:"role"`
}

type CollaboratorAddedEvent struct {
	Header EventHeader           `json:"header"`
	Data   CollaboratorAddedData `json:"data"`
}

type PlaylistTrackAddedData struct {
	PlaylistID      string   `json:"playlistId"`
	PlaylistName    string   `json:"playlistName"`
	TrackID         string   `json:"trackId"`
	TrackTitle      string   `json:"trackTitle"`
	AddedBy         string   `json:"addedBy"`
	AddedByName     string   `json:"addedByName"`
	CollaboratorIDs []string `json:"collaboratorIds"`
}

type PlaylistTrackAddedEvent struct {
	Header EventHeader            `json:"header"`
	Data   PlaylistTrackAddedData `json:"data"`
}
