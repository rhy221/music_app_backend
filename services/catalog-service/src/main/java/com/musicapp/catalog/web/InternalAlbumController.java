package com.musicapp.catalog.web;

import com.musicapp.catalog.domain.Album;
import com.musicapp.catalog.dto.response.InternalAlbumDto;
import com.musicapp.catalog.repository.AlbumRepository;
import com.musicapp.catalog.repository.TrackRepository;
import com.musicapp.catalog.domain.TrackStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/albums")
@RequiredArgsConstructor
public class InternalAlbumController {

    private final AlbumRepository albumRepository;
    private final TrackRepository trackRepository;

    @GetMapping("/{albumId}")
    @Transactional(readOnly = true)
    public InternalAlbumDto getInternalAlbum(@PathVariable UUID albumId) {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new EntityNotFoundException("Album not found: " + albumId));

        int trackCount = trackRepository.countByAlbumIdAndStatus(albumId, TrackStatus.PUBLISHED);

        return new InternalAlbumDto(
                album.getId(),
                album.getTitle(),
                album.getCoverUrl(),
                album.getArtist().getId(),
                album.getArtist().getName(),
                trackCount
        );
    }
}
