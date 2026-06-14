package com.musicapp.playlist.web;

import com.musicapp.playlist.domain.Playlist;
import com.musicapp.playlist.domain.PlaylistVisibility;
import com.musicapp.playlist.dto.response.InternalPlaylistDto;
import com.musicapp.playlist.repository.PlaylistRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/playlists")
@RequiredArgsConstructor
public class InternalPlaylistController {

    private final PlaylistRepository playlistRepository;

    @GetMapping("/{playlistId}")
    @Transactional(readOnly = true)
    public InternalPlaylistDto getInternalPlaylist(@PathVariable UUID playlistId) {
        Playlist playlist = playlistRepository.findById(playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist not found: " + playlistId));

        // Only expose public playlists via this internal endpoint
        if (playlist.getVisibility() == PlaylistVisibility.PRIVATE) {
            throw new EntityNotFoundException("Playlist not found: " + playlistId);
        }

        return new InternalPlaylistDto(
                playlist.getId(),
                playlist.getName(),
                playlist.getCoverUrl(),
                playlist.getOwnerId(),
                playlist.getTrackCount(),
                playlist.getVisibility()
        );
    }
}
