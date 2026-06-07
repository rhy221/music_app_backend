package domain

import "time"

type SessionStatus string

const (
	SessionStatusPlaying SessionStatus = "PLAYING"
	SessionStatusEnded   SessionStatus = "ENDED"
	SessionStatusPaused  SessionStatus = "PAUSED"
)

type EndReason string

const (
	EndReasonCompleted     EndReason = "COMPLETED"
	EndReasonSkipped       EndReason = "SKIPPED"
	EndReasonPausedTimeout EndReason = "PAUSED_TIMEOUT"
	EndReasonError         EndReason = "ERROR"
)

type PlaySession struct {
	ID         string
	UserID     string
	TrackID    string
	StartedAt  time.Time
	EndedAt    *time.Time
	PositionMs int
	DurationMs int
	Completed  bool
	Status     SessionStatus
	Source     *string
	Bitrate    *int
	EndReason  *string
}

// AssetURL is stored as JSONB in track_cache.asset_urls.
// StorageURL format: "bucket/objectKey" (e.g. "audio-transcoded/jobId/320k.mp3").
type AssetURL struct {
	Bitrate    int    `json:"bitrate"`
	Format     string `json:"format"`
	StorageURL string `json:"storageUrl"`
}

type TrackCache struct {
	TrackID    string
	Title      string
	DurationMs int
	Genre      string
	ArtistID   string
	ArtistName string
	CoverURL   *string
	AssetURLs  []AssetURL
	UpdatedAt  time.Time
}

// HistoryEntry is a play session joined with track metadata.
type HistoryEntry struct {
	Session    PlaySession
	TrackTitle string
	ArtistName string
	CoverURL   *string
}

type ListeningStats struct {
	TotalListeningMs int64         `json:"totalListeningMs"`
	TotalTracks      int64         `json:"totalTracks"`
	TotalSessions    int64         `json:"totalSessions"`
	TopGenres        []GenreCount  `json:"topGenres"`
	TopArtists       []ArtistCount `json:"topArtists"`
}

type GenreCount struct {
	Genre   string `json:"genre"`
	Count   int64  `json:"count"`
	TotalMs int64  `json:"totalMs"`
}

type ArtistCount struct {
	ArtistID   string `json:"artistId"`
	ArtistName string `json:"artistName"`
	Count      int64  `json:"count"`
}
