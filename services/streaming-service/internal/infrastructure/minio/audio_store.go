package minio

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
)

// AudioStore implements domain.AudioStore using MinIO.
// storageURL is treated as the object key within the configured bucket.
// Upload-service stores transcoded files in bucket "audio" with keys like
// "streams/{jobID}/{bitrate}k.mp3" — the bucket name is NOT part of storageURL.
type AudioStore struct {
	client *minio.Client
	bucket string
}

func NewAudioStore(client *minio.Client, bucket string) *AudioStore {
	return &AudioStore{client: client, bucket: bucket}
}

// GetObject opens a ranged byte stream from object storage.
// storageURL is the object key within the audio bucket (e.g. "streams/jobId/320k.mp3").
// Pass start=0, end=-1 to stream the full object.
func (s *AudioStore) GetObject(ctx context.Context, storageURL string, start, end int64) (io.ReadCloser, int64, error) {
	opts := minio.GetObjectOptions{}
	if end >= 0 {
		if err := opts.SetRange(start, end); err != nil {
			return nil, 0, fmt.Errorf("set range: %w", err)
		}
	}

	obj, err := s.client.GetObject(ctx, s.bucket, storageURL, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("minio get %s: %w", storageURL, err)
	}

	info, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, 0, fmt.Errorf("minio stat %s: %w", storageURL, err)
	}

	return obj, info.Size, nil
}
