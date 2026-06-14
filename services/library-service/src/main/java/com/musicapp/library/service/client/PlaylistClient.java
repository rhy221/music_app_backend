package com.musicapp.library.service.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@Slf4j
public class PlaylistClient {

    private final RestClient restClient;

    public PlaylistClient(@Value("${playlist.service.url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public InternalPlaylistDto getPlaylist(UUID playlistId) {
        try {
            return restClient.get()
                    .uri("/api/v1/internal/playlists/{id}", playlistId)
                    .retrieve()
                    .body(InternalPlaylistDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new jakarta.persistence.EntityNotFoundException("Playlist not found or private: " + playlistId);
        }
    }

    public record InternalPlaylistDto(
            String playlistId,
            String name,
            String coverUrl,
            String ownerId,
            int trackCount,
            String visibility
    ) {}
}
