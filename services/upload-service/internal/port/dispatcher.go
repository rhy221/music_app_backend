package port

type TranscodeWork struct {
	JobID        string
	UploaderID   string
	Title        string
	Genre        *string
	AlbumID      *string
	AlbumTitle   *string
	ReleaseDate  *string
	StorageKey   string
	ThumbnailURL *string
}

type Dispatcher interface {
	Submit(work TranscodeWork)
	CancelJob(jobID string)
}
