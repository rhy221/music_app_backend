package com.musicapp.library.service.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@Slf4j
public class CatalogClient {

    private final RestClient restClient;

    public CatalogClient(@Value("${catalog.service.url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public InternalAlbumDto getAlbum(UUID albumId) {
        try {
            return restClient.get()
                    .uri("/api/v1/internal/albums/{id}", albumId)
                    .retrieve()
                    .body(InternalAlbumDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new jakarta.persistence.EntityNotFoundException("Album not found: " + albumId);
        }
    }

    public InternalTrackDto getTrack(UUID trackId) {
        try {
            return restClient.get()
                    .uri("/api/v1/internal/tracks/{id}", trackId)
                    .retrieve()
                    .body(InternalTrackDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new jakarta.persistence.EntityNotFoundException("Track not found: " + trackId);
        }
    }

    public record InternalAlbumDto(
            String albumId,
            String title,
            String coverUrl,
            String artistId,
            String artistName,
            int trackCount
    ) {}

    public record InternalTrackDto(
            String id,
            String title,
            Integer durationMs,
            String coverUrl,
            String artistId,
            String artistName,
            String albumId,
            String albumTitle
    ) {}
}
