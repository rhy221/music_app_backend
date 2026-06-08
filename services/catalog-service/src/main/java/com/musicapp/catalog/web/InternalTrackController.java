package com.musicapp.catalog.web;

import com.musicapp.catalog.dto.request.PublishTrackRequest;
import com.musicapp.catalog.dto.response.InternalTrackDto;
import com.musicapp.catalog.dto.response.TrackDetailDto;
import com.musicapp.catalog.service.TrackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/tracks")
@RequiredArgsConstructor
public class InternalTrackController {

    private final TrackService trackService;

    @GetMapping("/{trackId}")
    public InternalTrackDto getInternalTrack(@PathVariable UUID trackId) {
        return trackService.getInternalTrack(trackId);
    }

    @PostMapping("/batch")
    public Map<UUID, InternalTrackDto> getInternalTracksBatch(@RequestBody List<UUID> trackIds) {
        return trackService.getInternalTracksBatch(trackIds);
    }

    @PostMapping("/publish")
    @ResponseStatus(HttpStatus.CREATED)
    public TrackDetailDto publishTrackFromUpload(@Valid @RequestBody PublishTrackRequest req) {
        return trackService.publishTrack(req);
    }
}
