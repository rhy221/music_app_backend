package minio

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	miniogo "github.com/minio/minio-go/v7"
)

const (
	bucketOriginals  = "audio-originals"
	bucketTranscoded = "audio-transcoded"
	bucketWaveforms  = "waveforms"
)

type FileStorage struct {
	client *miniogo.Client
}

func NewFileStorage(client *miniogo.Client) *FileStorage {
	return &FileStorage{client: client}
}

func (s *FileStorage) OriginalsBucket() string { return bucketOriginals }

func (s *FileStorage) BucketExists(ctx context.Context, bucket string) (bool, error) {
	return s.client.BucketExists(ctx, bucket)
}

func (s *FileStorage) StoreOriginal(ctx context.Context, jobID, filename string, r io.Reader, size int64) (string, error) {
	key := jobID + "/" + filename
	_, err := s.client.PutObject(ctx, bucketOriginals, key, r, size, miniogo.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	if err != nil {
		return "", fmt.Errorf("put original: %w", err)
	}
	return key, nil
}

func (s *FileStorage) StoreTranscoded(ctx context.Context, jobID string, bitrate int, localPath string) (string, int64, error) {
	f, err := os.Open(localPath)
	if err != nil {
		return "", 0, fmt.Errorf("open transcoded file: %w", err)
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return "", 0, err
	}
	sizeBytes := info.Size()
	key := fmt.Sprintf("%s/%dk.mp3", jobID, bitrate)

	_, err = s.client.PutObject(ctx, bucketTranscoded, key, f, sizeBytes, miniogo.PutObjectOptions{
		ContentType: "audio/mpeg",
	})
	if err != nil {
		return "", 0, fmt.Errorf("put transcoded: %w", err)
	}
	return key, sizeBytes, nil
}

func (s *FileStorage) StoreWaveform(ctx context.Context, jobID, localPath string) (string, error) {
	f, err := os.Open(localPath)
	if err != nil {
		return "", fmt.Errorf("open waveform file: %w", err)
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return "", err
	}
	key := jobID + "/waveform.png"
	_, err = s.client.PutObject(ctx, bucketWaveforms, key, f, info.Size(), miniogo.PutObjectOptions{
		ContentType: "image/png",
	})
	if err != nil {
		return "", fmt.Errorf("put waveform: %w", err)
	}
	return key, nil
}

func (s *FileStorage) DownloadOriginal(ctx context.Context, storageKey string) (string, error) {
	obj, err := s.client.GetObject(ctx, bucketOriginals, storageKey, miniogo.GetObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("get object: %w", err)
	}
	defer obj.Close()

	tmp, err := os.CreateTemp("", "upload-orig-*"+filepath.Ext(storageKey))
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	defer tmp.Close()

	if _, err := io.Copy(tmp, obj); err != nil {
		_ = os.Remove(tmp.Name())
		return "", fmt.Errorf("download original: %w", err)
	}
	return tmp.Name(), nil
}

func (s *FileStorage) DeleteJobFiles(ctx context.Context, jobID string) {
	for _, bucket := range []string{bucketOriginals, bucketTranscoded, bucketWaveforms} {
		objectsCh := s.client.ListObjects(ctx, bucket, miniogo.ListObjectsOptions{
			Prefix: jobID + "/",
		})
		for obj := range objectsCh {
			if obj.Err != nil {
				continue
			}
			_ = s.client.RemoveObject(ctx, bucket, obj.Key, miniogo.RemoveObjectOptions{})
		}
	}
}

func (s *FileStorage) EnsureBuckets(ctx context.Context) error {
	for _, bucket := range []string{bucketOriginals, bucketTranscoded, bucketWaveforms} {
		exists, err := s.client.BucketExists(ctx, bucket)
		if err != nil {
			return fmt.Errorf("check bucket %s: %w", bucket, err)
		}
		if !exists {
			if err := s.client.MakeBucket(ctx, bucket, miniogo.MakeBucketOptions{}); err != nil {
				return fmt.Errorf("make bucket %s: %w", bucket, err)
			}
		}
	}
	return nil
}
