// Package minio provides helpers for MinIO object storage operations.
package minio

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// NewMinioClient creates an initialised MinIO client.
func NewMinioClient(endpoint, accessKey, secretKey string, useSSL bool) (*minio.Client, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}
	return client, nil
}

// PresignedGetURL generates a presigned URL for streaming (GET) an object.
func PresignedGetURL(client *minio.Client, bucket, object string, expiry time.Duration) (string, error) {
	u, err := client.PresignedGetObject(context.Background(), bucket, object, expiry, url.Values{})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned get url: %w", err)
	}
	return u.String(), nil
}

// PresignedPutURL generates a presigned URL for uploading (PUT) an object.
func PresignedPutURL(client *minio.Client, bucket, object string, expiry time.Duration) (string, error) {
	u, err := client.PresignedPutObject(context.Background(), bucket, object, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned put url: %w", err)
	}
	return u.String(), nil
}
