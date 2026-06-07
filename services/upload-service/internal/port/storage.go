package port

import (
	"context"
	"io"
)

type FileStorage interface {
	StoreOriginal(ctx context.Context, jobID, filename string, r io.Reader, size int64) (key string, err error)
	StoreTranscoded(ctx context.Context, jobID string, bitrate int, localPath string) (key string, sizeBytes int64, err error)
	StoreWaveform(ctx context.Context, jobID, localPath string) (key string, err error)
	DownloadOriginal(ctx context.Context, key string) (localPath string, err error)
	DeleteJobFiles(ctx context.Context, jobID string)
	BucketExists(ctx context.Context, bucket string) (bool, error)
	OriginalsBucket() string
}
