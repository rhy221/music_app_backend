package com.musicapp.catalog.web;

import com.musicapp.catalog.dto.request.UpdateArtistRequest;
import com.musicapp.catalog.dto.response.ArtistDetailDto;
import com.musicapp.catalog.dto.response.ArtistSummaryDto;
import com.musicapp.catalog.service.ArtistService;
import com.musicapp.common.web.PaginatedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/artists")
@RequiredArgsConstructor
public class ArtistController {

    private final ArtistService artistService;

    @GetMapping
    public PaginatedResponse<ArtistSummaryDto> listArtists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return artistService.listArtists(PageRequest.of(page, Math.min(size, 100)));
    }

    @GetMapping("/{artistId}")
    public ArtistDetailDto getArtistById(@PathVariable UUID artistId) {
        return artistService.getArtistById(artistId);
    }

    @PutMapping("/{artistId}")
    public ArtistSummaryDto updateArtist(
            @PathVariable UUID artistId,
            @RequestBody UpdateArtistRequest req) {
        return artistService.updateArtist(artistId, req);
    }
}
