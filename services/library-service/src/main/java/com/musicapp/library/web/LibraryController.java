package com.musicapp.library.web;

import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import com.musicapp.library.dto.request.FollowPlaylistRequest;
import com.musicapp.library.dto.request.SaveAlbumRequest;
import com.musicapp.library.dto.request.SaveTrackRequest;
import com.musicapp.library.dto.response.FollowedPlaylistDto;
import com.musicapp.library.dto.response.SavedAlbumDto;
import com.musicapp.library.dto.response.SavedTrackDto;
import com.musicapp.library.service.LibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/library")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    // ── Albums ────────────────────────────────────────────────────────────────

    @PostMapping("/albums")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedAlbumDto saveAlbum(@Valid @RequestBody SaveAlbumRequest req) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.saveAlbum(userId, req);
    }

    @DeleteMapping("/albums/{albumId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsaveAlbum(@PathVariable UUID albumId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        libraryService.unsaveAlbum(userId, albumId);
    }

    @GetMapping("/albums")
    public PaginatedResponse<SavedAlbumDto> listSavedAlbums(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return PaginationMapper.toResponse(
                libraryService.listSavedAlbums(userId, PageRequest.of(page, Math.min(size, 100))),
                x -> x);
    }

    @GetMapping("/albums/{albumId}/saved")
    public Map<String, Boolean> isAlbumSaved(@PathVariable UUID albumId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.isAlbumSaved(userId, albumId);
    }

    // ── Playlists ─────────────────────────────────────────────────────────────

    @PostMapping("/playlists")
    @ResponseStatus(HttpStatus.CREATED)
    public FollowedPlaylistDto followPlaylist(@Valid @RequestBody FollowPlaylistRequest req) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.followPlaylist(userId, req);
    }

    @DeleteMapping("/playlists/{playlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollowPlaylist(@PathVariable UUID playlistId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        libraryService.unfollowPlaylist(userId, playlistId);
    }

    @GetMapping("/playlists")
    public PaginatedResponse<FollowedPlaylistDto> listFollowedPlaylists(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return PaginationMapper.toResponse(
                libraryService.listFollowedPlaylists(userId, PageRequest.of(page, Math.min(size, 100))),
                x -> x);
    }

    @GetMapping("/playlists/{playlistId}/followed")
    public Map<String, Boolean> isPlaylistFollowed(@PathVariable UUID playlistId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.isPlaylistFollowed(userId, playlistId);
    }

    // ── Tracks ────────────────────────────────────────────────────────────────

    @PostMapping("/tracks")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedTrackDto saveTrack(@Valid @RequestBody SaveTrackRequest req) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.saveTrack(userId, req);
    }

    @DeleteMapping("/tracks/{trackId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsaveTrack(@PathVariable UUID trackId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        libraryService.unsaveTrack(userId, trackId);
    }

    @GetMapping("/tracks")
    public PaginatedResponse<SavedTrackDto> listSavedTracks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return PaginationMapper.toResponse(
                libraryService.listSavedTracks(userId, PageRequest.of(page, Math.min(size, 100))),
                x -> x);
    }

    @GetMapping("/tracks/{trackId}/saved")
    public Map<String, Boolean> isTrackSaved(@PathVariable UUID trackId) {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        return libraryService.isTrackSaved(userId, trackId);
    }
}
