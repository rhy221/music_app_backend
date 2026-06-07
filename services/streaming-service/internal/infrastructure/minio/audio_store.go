package minio

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/minio/minio-go/v7"
)

// AudioStore implements domain.AudioStore using MinIO.
type AudioStore struct {
	client *minio.Client
}

func NewAudioStore(client *minio.Client) *AudioStore {
	return &AudioStore{client: client}
}

// GetObject opens a ranged byte stream from object storage.
// storageURL format: "bucket/objectKey" (e.g. "audio-transcoded/jobId/320k.mp3").
// Pass start=0, end=-1 to stream the full object.
func (s *AudioStore) GetObject(ctx context.Context, storageURL string, start, end int64) (io.ReadCloser, int64, error) {
	bucket, key, err := parseStorageURL(storageURL)
	if err != nil {
		return nil, 0, err
	}

	opts := minio.GetObjectOptions{}
	if end >= 0 {
		if err := opts.SetRange(start, end); err != nil {
			return nil, 0, fmt.Errorf("set range: %w", err)
		}
	}

	obj, err := s.client.GetObject(ctx, bucket, key, opts)
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

func parseStorageURL(storageURL string) (bucket, key string, err error) {
	idx := strings.Index(storageURL, "/")
	if idx < 0 {
		return "", "", fmt.Errorf("invalid storage URL %q: missing bucket separator", storageURL)
	}
	return storageURL[:idx], storageURL[idx+1:], nil
}
