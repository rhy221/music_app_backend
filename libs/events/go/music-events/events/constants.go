package events

// Exchanges groups RabbitMQ exchange names by domain.
var Exchanges = struct {
	Upload    string
	Catalog   string
	Streaming string
	User      string
	Playlist  string
}{
	Upload:    "events.upload",
	Catalog:   "events.catalog",
	Streaming: "events.streaming",
	User:      "events.user",
	Playlist:  "events.playlist",
}

// RoutingKeys maps event type names to their RabbitMQ routing keys.
var RoutingKeys = struct {
	TrackUploaded       string
	TranscodeCompleted  string
	TranscodeFailed     string
	TrackPublished      string
	TrackUpdated        string
	TrackDeleted        string
	TrackPlayed         string
	UserRegistered      string
	UserFollowed        string
	PlaylistShared      string
	CollaboratorAdded   string
	PlaylistTrackAdded  string
}{
	TrackUploaded:      "events.track.uploaded",
	TranscodeCompleted: "events.transcode.completed",
	TranscodeFailed:    "events.transcode.failed",
	TrackPublished:     "events.track.published",
	TrackUpdated:       "events.track.updated",
	TrackDeleted:       "events.track.deleted",
	TrackPlayed:        "events.track.played",
	UserRegistered:     "events.user.registered",
	UserFollowed:       "events.user.followed",
	PlaylistShared:     "events.playlist.shared",
	CollaboratorAdded:  "events.playlist.collaborator.added",
	PlaylistTrackAdded: "events.playlist.track.added",
}

// EventType constants match the eventType field in all event payloads.
const (
	EventTypeTrackUploaded      = "TRACK_UPLOADED"
	EventTypeTranscodeCompleted = "TRANSCODE_COMPLETED"
	EventTypeTranscodeFailed    = "TRANSCODE_FAILED"
	EventTypeTrackPublished     = "TRACK_PUBLISHED"
	EventTypeTrackUpdated       = "TRACK_UPDATED"
	EventTypeTrackDeleted       = "TRACK_DELETED"
	EventTypeTrackPlayed        = "TRACK_PLAYED"
	EventTypeUserRegistered     = "USER_REGISTERED"
	EventTypeUserFollowed       = "USER_FOLLOWED"
	EventTypePlaylistShared     = "PLAYLIST_SHARED"
	EventTypeCollaboratorAdded  = "COLLABORATOR_ADDED"
	EventTypePlaylistTrackAdded = "PLAYLIST_TRACK_ADDED"
)
