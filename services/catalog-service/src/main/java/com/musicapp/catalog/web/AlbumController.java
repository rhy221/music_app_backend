package com.musicapp.catalog.web;

import com.musicapp.catalog.dto.request.CreateAlbumRequest;
import com.musicapp.catalog.dto.request.UpdateAlbumRequest;
import com.musicapp.catalog.dto.response.AlbumDetailDto;
import com.musicapp.catalog.dto.response.AlbumSummaryDto;
import com.musicapp.catalog.service.AlbumService;
import com.musicapp.common.web.PaginatedResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/albums")
@RequiredArgsConstructor
public class AlbumController {

    private final AlbumService albumService;

    @GetMapping
    public PaginatedResponse<AlbumSummaryDto> listAlbums(
            @RequestParam(required = false) UUID artistId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return albumService.listAlbums(artistId, PageRequest.of(page, Math.min(size, 100)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AlbumSummaryDto createAlbum(@Valid @RequestBody CreateAlbumRequest req) {
        return albumService.createAlbum(req);
    }

    @GetMapping("/{albumId}")
    public AlbumDetailDto getAlbumById(@PathVariable UUID albumId) {
        return albumService.getAlbumById(albumId);
    }

    @PutMapping("/{albumId}")
    public AlbumSummaryDto updateAlbum(
            @PathVariable UUID albumId,
            @RequestBody UpdateAlbumRequest req) {
        return albumService.updateAlbum(albumId, req);
    }
}
