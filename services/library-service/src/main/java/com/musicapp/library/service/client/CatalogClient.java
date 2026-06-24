package com.musicapp.library.service.client;

import com.musicapp.common.web.ServiceUnavailableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.UUID;

@Component
@Slf4j
public class CatalogClient {

    private final RestClient restClient;

    public CatalogClient(@Value("${catalog.service.url}") String baseUrl) {
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @CircuitBreaker(name = "catalogService", fallbackMethod = "fallback")
    @Retry(name = "catalogService")
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

    @CircuitBreaker(name = "catalogService", fallbackMethod = "fallback")
    @Retry(name = "catalogService")
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

    @SuppressWarnings("unused")
    private <T> T fallback(UUID id, Exception ex) {
        log.error("Catalog service unavailable, id={}: {}", id, ex.getMessage());
        throw new ServiceUnavailableException("Catalog service is temporarily unavailable", ex);
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
