package com.company.userservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PlaylistController {

    @GetMapping("/playlists")
    public Map<String, Object> getMyPlaylists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var playlist = Map.of(
                "playlistId", "playlist-001",
                "title", "My Favorites",
                "visibility", "PRIVATE",
                "trackCount", 12,
                "owner", Map.of("userId", "user-001", "displayName", "Mock User"),
                "createdAt", "2024-01-15T10:00:00Z"
        );
        return Map.of("items", List.of(playlist), "total", 1, "page", page, "size", size);
    }

    @PostMapping("/playlists")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createPlaylist(@RequestBody Map<String, Object> request) {
        return Map.of(
                "playlistId", UUID.randomUUID().toString(),
                "title", request.getOrDefault("title", "New Playlist"),
                "visibility", request.getOrDefault("visibility", "PRIVATE"),
                "trackCount", 0,
                "owner", Map.of("userId", "user-001", "displayName", "Mock User"),
                "createdAt", "2024-01-15T10:00:00Z"
        );
    }

    @GetMapping("/playlists/{playlistId}")
    public Map<String, Object> getPlaylistById(@PathVariable String playlistId) {
        return Map.of(
                "playlistId", playlistId,
                "title", "My Favorites",
                "visibility", "PUBLIC",
                "trackCount", 12,
                "owner", Map.of("userId", "user-001", "displayName", "Mock User"),
                "items", List.of(
                        Map.of(
                                "itemId", "item-001",
                                "position", 1,
                                "track", Map.of(
                                        "trackId", "track-001",
                                        "title", "Starlight Serenade",
                                        "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                                        "duration", 215
                                )
                        )
                ),
                "createdAt", "2024-01-15T10:00:00Z"
        );
    }

    @PatchMapping("/playlists/{playlistId}")
    public Map<String, Object> updatePlaylist(@PathVariable String playlistId,
            @RequestBody Map<String, Object> request) {
        return Map.of(
                "playlistId", playlistId,
                "title", request.getOrDefault("title", "Updated Playlist"),
                "visibility", request.getOrDefault("visibility", "PUBLIC"),
                "trackCount", 12,
                "owner", Map.of("userId", "user-001", "displayName", "Mock User")
        );
    }

    @DeleteMapping("/playlists/{playlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlaylist(@PathVariable String playlistId) {
    }

    @PostMapping("/playlists/{playlistId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addTrack(@PathVariable String playlistId,
            @RequestBody Map<String, Object> request) {
        return Map.of(
                "itemId", UUID.randomUUID().toString(),
                "playlistId", playlistId,
                "position", 13,
                "track", Map.of(
                        "trackId", request.getOrDefault("trackId", "track-001"),
                        "title", "Added Track",
                        "artist", Map.of("artistId", "artist-001", "displayName", "Luna Echo"),
                        "duration", 200
                )
        );
    }

    @DeleteMapping("/playlists/{playlistId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTrack(@PathVariable String playlistId, @PathVariable String itemId) {
    }

    @GetMapping("/users/{userId}/playlists")
    public Map<String, Object> getUserPlaylists(@PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Map.of("items", List.of(), "total", 0, "page", page, "size", size);
    }
}
