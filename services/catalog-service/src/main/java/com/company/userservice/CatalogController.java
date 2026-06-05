package com.company.userservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {

    @GetMapping("/tracks")
    public Map<String, Object> listTracks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String status) {
        var track = Map.of(
                "trackId", "track-001",
                "title", "Starlight Serenade",
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "album", Map.of("albumId", "album-001", "title", "Midnight Dreams"),
                "duration", 215,
                "genre", "POP",
                "status", "PUBLISHED",
                "playCount", 142_000
        );
        return Map.of(
                "items", List.of(track),
                "total", 1,
                "page", page,
                "size", size,
                "totalPages", 1
        );
    }

    @GetMapping("/tracks/popular")
    public Map<String, Object> getPopularTracks(@RequestParam(defaultValue = "10") int limit) {
        var track = Map.of(
                "trackId", "track-001",
                "title", "Starlight Serenade",
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "playCount", 142_000
        );
        return Map.of("items", List.of(track), "total", 1);
    }

    @GetMapping("/tracks/new-releases")
    public Map<String, Object> getNewReleases(@RequestParam(defaultValue = "10") int limit) {
        return Map.of("items", List.of(), "total", 0);
    }

    @GetMapping("/tracks/{trackId}")
    public Map<String, Object> getTrackById(@PathVariable String trackId) {
        return Map.of(
                "trackId", trackId,
                "title", "Starlight Serenade",
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "album", Map.of("albumId", "album-001", "title", "Midnight Dreams"),
                "duration", 215,
                "genre", "POP",
                "status", "PUBLISHED",
                "audioAssets", List.of(
                        Map.of("format", "MP3_128", "url", "https://cdn.example.com/tracks/track-001.mp3"),
                        Map.of("format", "FLAC", "url", "https://cdn.example.com/tracks/track-001.flac")
                )
        );
    }

    @PutMapping("/tracks/{trackId}")
    public Map<String, Object> updateTrack(@PathVariable String trackId,
            @RequestBody Map<String, Object> request) {
        request.put("trackId", trackId);
        return request;
    }

    @DeleteMapping("/tracks/{trackId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTrack(@PathVariable String trackId) {
    }

    @GetMapping("/albums")
    public Map<String, Object> listAlbums(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var album = Map.of(
                "albumId", "album-001",
                "title", "Midnight Dreams",
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "trackCount", 10,
                "releaseDate", "2024-03-15"
        );
        return Map.of("items", List.of(album), "total", 1, "page", page, "size", size);
    }

    @GetMapping("/albums/{albumId}")
    public Map<String, Object> getAlbumById(@PathVariable String albumId) {
        return Map.of(
                "albumId", albumId,
                "title", "Midnight Dreams",
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "trackCount", 10,
                "releaseDate", "2024-03-15",
                "tracks", List.of()
        );
    }

    @PostMapping("/albums")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createAlbum(@RequestBody Map<String, Object> request) {
        return Map.of(
                "albumId", "album-" + System.currentTimeMillis(),
                "title", request.getOrDefault("title", "New Album"),
                "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                "trackCount", 0
        );
    }

    @GetMapping("/artists")
    public Map<String, Object> listArtists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var artist = Map.of(
                "artistId", "artist-001",
                "displayName", "Luna Echo",
                "bio", "Electronic/pop artist from Hanoi",
                "followerCount", 25_000
        );
        return Map.of("items", List.of(artist), "total", 1, "page", page, "size", size);
    }

    @GetMapping("/artists/{artistId}")
    public Map<String, Object> getArtistById(@PathVariable String artistId) {
        return Map.of(
                "artistId", artistId,
                "displayName", "Luna Echo",
                "bio", "Electronic/pop artist from Hanoi",
                "followerCount", 25_000,
                "albums", List.of()
        );
    }

    @GetMapping("/internal/tracks/{trackId}")
    public Map<String, Object> getInternalTrack(@PathVariable String trackId) {
        return Map.of(
                "trackId", trackId,
                "title", "Starlight Serenade",
                "status", "PUBLISHED",
                "audioFiles", Map.of("MP3_128", "https://cdn.example.com/tracks/" + trackId + ".mp3")
        );
    }
}
