package port

import (
	"context"
	"io"
	"time"
)

type FileStorage interface {
	// Server-side uploads
	StoreOriginal(ctx context.Context, jobID, filename string, r io.Reader, size int64) (key string, err error)
	StoreTranscoded(ctx context.Context, jobID string, bitrate int, localPath string) (key string, sizeBytes int64, err error)
	StoreWaveform(ctx context.Context, jobID, localPath string) (key string, err error)
	StoreThumbnail(ctx context.Context, draftID, filename string, r io.Reader, size int64) (key string, err error)

	// Client-side (presigned) audio upload support
	AudioObjectKey(trackID, filename string) string
	PresignedAudioPutURL(ctx context.Context, objectKey string, ttl time.Duration) (url string, err error)
	ObjectSize(ctx context.Context, objectKey string) (int64, error)

	// Worker operations
	DownloadOriginal(ctx context.Context, key string) (localPath string, err error)
	DeleteJobFiles(ctx context.Context, jobID string)
	DeleteDraftThumbnail(ctx context.Context, draftID string)

	// Health
	BucketExists(ctx context.Context, bucket string) (bool, error)
	EnsureBuckets(ctx context.Context) error
}
