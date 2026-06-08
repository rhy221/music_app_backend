package com.musicapp.catalog.web;

import com.musicapp.catalog.dto.request.UpdateTrackRequest;
import com.musicapp.catalog.dto.response.TrackDetailDto;
import com.musicapp.catalog.dto.response.TrackSummaryDto;
import com.musicapp.catalog.service.TrackService;
import com.musicapp.common.web.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tracks")
@RequiredArgsConstructor
public class TrackController {

    private final TrackService trackService;

    @GetMapping
    public PaginatedResponse<TrackSummaryDto> listTracks(
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) UUID artistId,
            @RequestParam(required = false) UUID albumId,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return trackService.listTracks(genre, artistId, albumId, sort,
                PageRequest.of(page, Math.min(size, 100)));
    }

    @GetMapping("/popular")
    @Cacheable(cacheNames = "tracks:popular", key = "#genre + ':' + #period")
    public List<TrackSummaryDto> getPopularTracks(
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String genre,
            @RequestParam(defaultValue = "all") String period) {
        return trackService.getPopularTracks(limit, genre, period);
    }

    @GetMapping("/new-releases")
    @Cacheable(cacheNames = "tracks:new-releases", key = "'all'")
    public List<TrackSummaryDto> getNewReleases(
            @RequestParam(defaultValue = "20") int limit) {
        return trackService.getNewReleases(limit);
    }

    @GetMapping("/{trackId}")
    public TrackDetailDto getTrackById(@PathVariable UUID trackId) {
        return trackService.getTrackById(trackId);
    }

    @PutMapping("/{trackId}")
    public TrackDetailDto updateTrack(
            @PathVariable UUID trackId,
            @RequestBody UpdateTrackRequest req) {
        return trackService.updateTrack(trackId, req);
    }

    @DeleteMapping("/{trackId}")
    public ResponseEntity<Void> deleteTrack(@PathVariable UUID trackId) {
        trackService.deleteTrack(trackId);
        return ResponseEntity.noContent().build();
    }
}
