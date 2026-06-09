package minio

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	miniogo "github.com/minio/minio-go/v7"
)

const (
	bucketImages = "images"
	bucketAudio  = "audio"
)

type FileStorage struct {
	client *miniogo.Client
}

func NewFileStorage(client *miniogo.Client) *FileStorage {
	return &FileStorage{client: client}
}

func (s *FileStorage) BucketExists(ctx context.Context, bucket string) (bool, error) {
	return s.client.BucketExists(ctx, bucket)
}

func (s *FileStorage) EnsureBuckets(ctx context.Context) error {
	for _, bucket := range []string{bucketImages, bucketAudio} {
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

// StoreOriginal saves an audio file server-side (legacy/fallback path).
// key pattern: originals/{jobID}/source.{ext}
func (s *FileStorage) StoreOriginal(ctx context.Context, jobID, filename string, r io.Reader, size int64) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	key := fmt.Sprintf("originals/%s/source%s", jobID, ext)
	_, err := s.client.PutObject(ctx, bucketAudio, key, r, size, miniogo.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	if err != nil {
		return "", fmt.Errorf("put original: %w", err)
	}
	return key, nil
}

// StoreTranscoded saves a transcoded MP3 produced by the worker.
// key pattern: streams/{jobID}/{bitrate}k.mp3
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
	key := fmt.Sprintf("streams/%s/%dk.mp3", jobID, bitrate)

	_, err = s.client.PutObject(ctx, bucketAudio, key, f, sizeBytes, miniogo.PutObjectOptions{
		ContentType: "audio/mpeg",
	})
	if err != nil {
		return "", 0, fmt.Errorf("put transcoded: %w", err)
	}
	return key, sizeBytes, nil
}

// StoreWaveform saves a waveform PNG produced by the worker.
// key pattern: waveforms/{jobID}/waveform.png
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
	key := fmt.Sprintf("waveforms/%s/waveform.png", jobID)
	_, err = s.client.PutObject(ctx, bucketImages, key, f, info.Size(), miniogo.PutObjectOptions{
		ContentType: "image/png",
	})
	if err != nil {
		return "", fmt.Errorf("put waveform: %w", err)
	}
	return key, nil
}

// StoreThumbnail saves an artwork image for a draft.
// key pattern: artworks/{draftID}/cover_large.{ext}
func (s *FileStorage) StoreThumbnail(ctx context.Context, draftID, filename string, r io.Reader, size int64) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".jpg"
	}
	key := fmt.Sprintf("artworks/%s/cover_large%s", draftID, ext)
	contentType := "image/jpeg"
	switch ext {
	case ".png":
		contentType = "image/png"
	case ".webp":
		contentType = "image/webp"
	case ".gif":
		contentType = "image/gif"
	}
	_, err := s.client.PutObject(ctx, bucketImages, key, r, size, miniogo.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("put thumbnail: %w", err)
	}
	return key, nil
}

// AudioObjectKey returns the object key for a draft track's audio in the audio bucket.
// key pattern: originals/{trackID}/source.{ext}
func (s *FileStorage) AudioObjectKey(trackID, filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	if ext == "" {
		ext = ".mp3"
	}
	return fmt.Sprintf("originals/%s/source%s", trackID, ext)
}

// PresignedAudioPutURL generates a presigned PUT URL for the client to upload audio directly.
func (s *FileStorage) PresignedAudioPutURL(ctx context.Context, objectKey string, ttl time.Duration) (string, error) {
	u, err := s.client.PresignedPutObject(ctx, bucketAudio, objectKey, ttl)
	if err != nil {
		return "", fmt.Errorf("presign audio put: %w", err)
	}
	return u.String(), nil
}

// ObjectSize returns the size of an object in the audio bucket (used to verify client upload completed).
func (s *FileStorage) ObjectSize(ctx context.Context, objectKey string) (int64, error) {
	info, err := s.client.StatObject(ctx, bucketAudio, objectKey, miniogo.StatObjectOptions{})
	if err != nil {
		return 0, fmt.Errorf("stat object: %w", err)
	}
	return info.Size, nil
}

// DownloadOriginal downloads an audio original to a local temp file for transcoding.
func (s *FileStorage) DownloadOriginal(ctx context.Context, storageKey string) (string, error) {
	obj, err := s.client.GetObject(ctx, bucketAudio, storageKey, miniogo.GetObjectOptions{})
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

// DeleteJobFiles removes all storage objects associated with a job.
func (s *FileStorage) DeleteJobFiles(ctx context.Context, jobID string) {
	s.deletePrefix(ctx, bucketAudio, "originals/"+jobID+"/")
	s.deletePrefix(ctx, bucketAudio, "streams/"+jobID+"/")
	s.deletePrefix(ctx, bucketImages, "waveforms/"+jobID+"/")
}

// DeleteDraftThumbnail removes the artwork uploaded for a draft.
func (s *FileStorage) DeleteDraftThumbnail(ctx context.Context, draftID string) {
	s.deletePrefix(ctx, bucketImages, "artworks/"+draftID+"/")
}

func (s *FileStorage) deletePrefix(ctx context.Context, bucket, prefix string) {
	objectsCh := s.client.ListObjects(ctx, bucket, miniogo.ListObjectsOptions{Prefix: prefix})
	for obj := range objectsCh {
		if obj.Err != nil {
			continue
		}
		_ = s.client.RemoveObject(ctx, bucket, obj.Key, miniogo.RemoveObjectOptions{})
	}
}
