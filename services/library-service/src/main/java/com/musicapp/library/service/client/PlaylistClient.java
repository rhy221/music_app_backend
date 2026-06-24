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
public class PlaylistClient {

    private final RestClient restClient;

    public PlaylistClient(@Value("${playlist.service.url}") String baseUrl) {
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

    @CircuitBreaker(name = "playlistService", fallbackMethod = "fallback")
    @Retry(name = "playlistService")
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

    @SuppressWarnings("unused")
    private InternalPlaylistDto fallback(UUID playlistId, Exception ex) {
        log.error("Playlist service unavailable, playlistId={}: {}", playlistId, ex.getMessage());
        throw new ServiceUnavailableException("Playlist service is temporarily unavailable", ex);
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
