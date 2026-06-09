package com.musicapp.playlist.web;

import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.playlist.dto.request.AddTrackRequest;
import com.musicapp.playlist.dto.request.CreatePlaylistRequest;
import com.musicapp.playlist.dto.request.ReorderRequest;
import com.musicapp.playlist.dto.request.UpdatePlaylistRequest;
import com.musicapp.playlist.dto.response.PlaylistDetailDto;
import com.musicapp.playlist.dto.response.PlaylistItemDto;
import com.musicapp.playlist.dto.response.PlaylistSummaryDto;
import com.musicapp.playlist.service.PlaylistItemService;
import com.musicapp.playlist.service.PlaylistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;
    private final PlaylistItemService playlistItemService;

    @GetMapping
    public PaginatedResponse<PlaylistSummaryDto> getMyPlaylists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("updatedAt").descending());
        return playlistService.getMyPlaylists(userId, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlaylistDetailDto createPlaylist(@Valid @RequestBody CreatePlaylistRequest request) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return playlistService.createPlaylist(userId, request);
    }

    @GetMapping("/{playlistId}")
    public PlaylistDetailDto getPlaylistById(
            @PathVariable UUID playlistId,
            Authentication authentication) {
        UUID userId = resolveOptionalUser(authentication);
        return playlistService.getPlaylistById(playlistId, userId);
    }

    @PatchMapping("/{playlistId}")
    public PlaylistDetailDto updatePlaylist(
            @PathVariable UUID playlistId,
            @Valid @RequestBody UpdatePlaylistRequest request) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return playlistService.updatePlaylist(playlistId, userId, request);
    }

    @DeleteMapping("/{playlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlaylist(@PathVariable UUID playlistId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        playlistService.deletePlaylist(playlistId, userId);
    }

    @PostMapping("/{playlistId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public PlaylistItemDto addTrack(
            @PathVariable UUID playlistId,
            @Valid @RequestBody AddTrackRequest request) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return playlistItemService.addTrack(playlistId, userId, request);
    }

    @DeleteMapping("/{playlistId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTrack(
            @PathVariable UUID playlistId,
            @PathVariable UUID itemId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        playlistItemService.removeTrack(playlistId, itemId, userId);
    }

    @PutMapping("/{playlistId}/items/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorderItems(
            @PathVariable UUID playlistId,
            @Valid @RequestBody ReorderRequest request) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        playlistItemService.reorderItems(playlistId, userId, request);
    }

    private UUID resolveOptionalUser(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            return UUID.fromString((String) authentication.getPrincipal());
        }
        return null;
    }
}
