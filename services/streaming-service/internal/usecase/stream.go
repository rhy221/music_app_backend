package usecase

import (
	"context"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/rs/zerolog"
	"music-app/streaming-service/internal/domain"
)

// AudioResult carries the resolved audio stream back to the handler.
type AudioResult struct {
	Reader     io.ReadCloser
	TotalSize  int64
	HasRange   bool
	RangeStart int64
	RangeEnd   int64
}

// StreamUseCase resolves audio assets and builds HLS playlists.
type StreamUseCase struct {
	tracks  domain.TrackCacheRepository
	catalog domain.CatalogClient
	store   domain.AudioStore
	log     zerolog.Logger
}

func NewStreamUseCase(
	tracks domain.TrackCacheRepository,
	catalog domain.CatalogClient,
	store domain.AudioStore,
	log zerolog.Logger,
) *StreamUseCase {
	return &StreamUseCase{
		tracks:  tracks,
		catalog: catalog,
		store:   store,
		log:     log.With().Str("usecase", "stream").Logger(),
	}
}

// GetAudio resolves the best asset for the requested bitrate and opens a ranged reader.
func (uc *StreamUseCase) GetAudio(ctx context.Context, trackID string, preferredBitrate int, rangeHeader string) (*AudioResult, error) {
	tc, err := uc.getOrFetchTrack(ctx, trackID)
	if err != nil {
		return nil, domain.ErrNotFound
	}

	asset := selectAsset(tc, preferredBitrate)
	if asset == nil {
		return nil, domain.ErrNotFound
	}

	start, end, hasRange, err := parseRangeHeader(rangeHeader)
	if err != nil {
		return nil, domain.ErrRangeNotSatisfiable
	}

	reader, totalSize, err := uc.store.GetObject(ctx, asset.StorageURL, start, end)
	if err != nil {
		return nil, fmt.Errorf("audio unavailable: %w", err)
	}

	serveStart := start
	serveEnd := end
	if !hasRange {
		serveStart = 0
		serveEnd = totalSize - 1
	} else if serveEnd < 0 || serveEnd >= totalSize {
		serveEnd = totalSize - 1
	}

	return &AudioResult{
		Reader:     reader,
		TotalSize:  totalSize,
		HasRange:   hasRange,
		RangeStart: serveStart,
		RangeEnd:   serveEnd,
	}, nil
}

// GetHLSPlaylist generates an HLS master playlist (.m3u8) for adaptive bitrate streaming.
func (uc *StreamUseCase) GetHLSPlaylist(ctx context.Context, trackID string) (string, error) {
	tc, err := uc.getOrFetchTrack(ctx, trackID)
	if err != nil {
		return "", domain.ErrNotFound
	}
	if len(tc.AssetURLs) == 0 {
		return "", domain.ErrNotFound
	}

	var sb strings.Builder
	sb.WriteString("#EXTM3U\n")
	sb.WriteString("#EXT-X-VERSION:3\n\n")
	for _, bitrate := range []int{128, 256, 320} {
		if hasAsset(tc, bitrate) {
			fmt.Fprintf(&sb, "#EXT-X-STREAM-INF:BANDWIDTH=%d,CODECS=\"mp4a.40.2\"\n", bitrate*1000)
			fmt.Fprintf(&sb, "/api/v1/stream/%s?bitrate=%d\n\n", trackID, bitrate)
		}
	}
	return sb.String(), nil
}

func (uc *StreamUseCase) getOrFetchTrack(ctx context.Context, trackID string) (*domain.TrackCache, error) {
	tc, err := uc.tracks.Get(ctx, trackID)
	if err == nil {
		return tc, nil
	}
	tc, err = uc.catalog.GetTrack(ctx, trackID)
	if err != nil {
		return nil, err
	}
	_ = uc.tracks.Upsert(ctx, tc)
	return tc, nil
}

// selectAsset picks the best asset: exact bitrate → next lower → any available.
func selectAsset(tc *domain.TrackCache, preferredBitrate int) *domain.AssetURL {
	for i := range tc.AssetURLs {
		if tc.AssetURLs[i].Bitrate == preferredBitrate {
			return &tc.AssetURLs[i]
		}
	}
	var best *domain.AssetURL
	for i := range tc.AssetURLs {
		if tc.AssetURLs[i].Bitrate < preferredBitrate {
			if best == nil || tc.AssetURLs[i].Bitrate > best.Bitrate {
				best = &tc.AssetURLs[i]
			}
		}
	}
	if best != nil {
		return best
	}
	if len(tc.AssetURLs) > 0 {
		return &tc.AssetURLs[0]
	}
	return nil
}

func hasAsset(tc *domain.TrackCache, bitrate int) bool {
	for _, a := range tc.AssetURLs {
		if a.Bitrate == bitrate {
			return true
		}
	}
	return false
}

// parseRangeHeader parses "Range: bytes=start-end" per RFC 7233.
func parseRangeHeader(header string) (start, end int64, hasRange bool, err error) {
	if header == "" {
		return 0, -1, false, nil
	}
	if !strings.HasPrefix(header, "bytes=") {
		return 0, -1, false, fmt.Errorf("unsupported range unit")
	}
	parts := strings.SplitN(strings.TrimPrefix(header, "bytes="), "-", 2)
	if len(parts) != 2 {
		return 0, -1, false, fmt.Errorf("malformed range")
	}
	if parts[0] != "" {
		start, err = strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return 0, -1, false, fmt.Errorf("parse range start: %w", err)
		}
	}
	if parts[1] != "" {
		end, err = strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			return 0, -1, false, fmt.Errorf("parse range end: %w", err)
		}
	} else {
		end = -1
	}
	return start, end, true, nil
}
