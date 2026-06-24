package catalog

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/sony/gobreaker/v2"

	"music-app/streaming-service/internal/domain"
)

type assetInfo struct {
	Bitrate    int    `json:"bitrate"`
	Format     string `json:"format"`
	StorageURL string `json:"storageUrl"`
}

type internalTrackDTO struct {
	ID         string      `json:"id"`
	Title      string      `json:"title"`
	DurationMs int         `json:"durationMs"`
	CoverURL   *string     `json:"coverUrl,omitempty"`
	Genre      string      `json:"genre"`
	ArtistID   string      `json:"artistId"`
	ArtistName string      `json:"artistName"`
	Assets     []assetInfo `json:"assets"`
}

type HTTPCatalogClient struct {
	baseURL    string
	httpClient *http.Client
	cb         *gobreaker.CircuitBreaker[*domain.TrackCache]
}

func NewHTTPCatalogClient(baseURL string) *HTTPCatalogClient {
	cbSettings := gobreaker.Settings{
		Name:        "catalog-service",
		MaxRequests: 3,
		Interval:    10 * time.Second,
		Timeout:     30 * time.Second,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			return counts.ConsecutiveFailures >= 5
		},
		IsSuccessful: func(err error) bool {
			return err == nil || errors.Is(err, domain.ErrNotFound)
		},
	}

	return &HTTPCatalogClient{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 5 * time.Second},
		cb:         gobreaker.NewCircuitBreaker[*domain.TrackCache](cbSettings),
	}
}

func (c *HTTPCatalogClient) GetTrack(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	result, err := c.cb.Execute(func() (*domain.TrackCache, error) {
		return c.getTrackWithRetry(ctx, trackID)
	})
	if err != nil {
		return nil, fmt.Errorf("catalog request failed: %w", err)
	}
	return result, nil
}

func (c *HTTPCatalogClient) getTrackWithRetry(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	const maxAttempts = 3
	var lastErr error

	for attempt := range maxAttempts {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt-1))) * 500 * time.Millisecond
			select {
			case <-time.After(backoff):
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		}

		result, err := c.doGetTrack(ctx, trackID)
		if err == nil {
			return result, nil
		}
		if errors.Is(err, domain.ErrNotFound) {
			return nil, err
		}
		lastErr = err
	}
	return nil, lastErr
}

func (c *HTTPCatalogClient) doGetTrack(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	url := fmt.Sprintf("%s/api/v1/internal/tracks/%s", c.baseURL, trackID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build catalog request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("catalog request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, domain.ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("catalog returned %d for track %s", resp.StatusCode, trackID)
	}

	var dto internalTrackDTO
	if err := json.NewDecoder(resp.Body).Decode(&dto); err != nil {
		return nil, fmt.Errorf("decode catalog response: %w", err)
	}

	assets := make([]domain.AssetURL, 0, len(dto.Assets))
	for _, a := range dto.Assets {
		assets = append(assets, domain.AssetURL{
			Bitrate:    a.Bitrate,
			Format:     a.Format,
			StorageURL: a.StorageURL,
		})
	}
	return &domain.TrackCache{
		TrackID:    dto.ID,
		Title:      dto.Title,
		DurationMs: dto.DurationMs,
		Genre:      dto.Genre,
		ArtistID:   dto.ArtistID,
		ArtistName: dto.ArtistName,
		CoverURL:   dto.CoverURL,
		AssetURLs:  assets,
	}, nil
}
