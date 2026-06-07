package catalog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"music-app/streaming-service/internal/domain"
)

// assetInfo mirrors the asset structure in the Catalog service internal API response.
type assetInfo struct {
	Bitrate    int    `json:"bitrate"`
	Format     string `json:"format"`
	StorageURL string `json:"storageUrl"`
}

// internalTrackDTO is the response from GET /api/v1/internal/tracks/{trackId}.
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

// HTTPCatalogClient implements domain.CatalogClient by calling the Catalog internal API.
type HTTPCatalogClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewHTTPCatalogClient(baseURL string) *HTTPCatalogClient {
	return &HTTPCatalogClient{
		baseURL:    baseURL,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

// GetTrack fetches track metadata from the Catalog service and maps it to the domain model.
func (c *HTTPCatalogClient) GetTrack(ctx context.Context, trackID string) (*domain.TrackCache, error) {
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
