package domain

import "time"

type DraftStatus string

const (
	DraftStatusDraft     DraftStatus = "DRAFT"
	DraftStatusSubmitted DraftStatus = "SUBMITTED"
	DraftStatusCancelled DraftStatus = "CANCELLED"
)

type ReleaseType string

const (
	ReleaseTypeSingle ReleaseType = "SINGLE"
	ReleaseTypeAlbum  ReleaseType = "ALBUM"
)

type UploadDraft struct {
	ID           string
	UploaderID   string
	ReleaseType  ReleaseType
	Title        string
	Genre        *string
	ThumbnailURL *string
	Status       DraftStatus
	Tracks       []DraftTrack
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type DraftTrack struct {
	ID               string
	DraftID          string
	Title            string
	TrackNumber      int
	StorageURL       *string
	OriginalFilename *string
	SizeBytes        *int64
	CreatedAt        time.Time
}

func (d *UploadDraft) CanSubmit() bool {
	if d.Status != DraftStatusDraft || len(d.Tracks) == 0 {
		return false
	}
	for _, t := range d.Tracks {
		if t.StorageURL == nil {
			return false
		}
	}
	return true
}

func (d *UploadDraft) CanCancel() bool {
	return d.Status == DraftStatusDraft
}
