package com.musicapp.playlist.service;

import com.company.events.EventConstants;
import com.company.events.EventHeader;
import com.company.events.playlist.PlaylistSharedEvent;
import com.musicapp.playlist.domain.*;
import com.musicapp.playlist.dto.mapper.CollaboratorMapper;
import com.musicapp.playlist.dto.mapper.PlaylistItemMapper;
import com.musicapp.playlist.dto.request.CreatePlaylistRequest;
import com.musicapp.playlist.dto.request.UpdatePlaylistRequest;
import com.musicapp.playlist.dto.response.CollaboratorDto;
import com.musicapp.playlist.dto.response.PlaylistDetailDto;
import com.musicapp.playlist.dto.response.PlaylistItemDto;
import com.musicapp.playlist.dto.response.PlaylistSummaryDto;
import com.musicapp.playlist.repository.CollaboratorRepository;
import com.musicapp.playlist.repository.PlaylistItemRepository;
import com.musicapp.playlist.repository.PlaylistRepository;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistItemRepository playlistItemRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final OutboxService outboxService;
    private final PlaylistItemMapper playlistItemMapper;
    private final CollaboratorMapper collaboratorMapper;

    @Transactional(readOnly = true)
    public PaginatedResponse<PlaylistSummaryDto> getMyPlaylists(UUID userId, Pageable pageable) {
        var page = playlistRepository.findAllByUserIdAsOwnerOrCollaborator(userId, pageable);
        return PaginationMapper.toResponse(page, this::toSummary);
    }

    public PlaylistDetailDto createPlaylist(UUID userId, CreatePlaylistRequest request) {
        var playlist = new Playlist();
        playlist.setOwnerId(userId);
        playlist.setName(request.name());
        playlist.setDescription(request.description());
        playlist.setVisibility(request.visibility() != null ? request.visibility() : PlaylistVisibility.PRIVATE);
        playlistRepository.save(playlist);
        return toDetail(playlist, List.of(), List.of(), true, true);
    }

    @Transactional(readOnly = true)
    public PlaylistDetailDto getPlaylistById(UUID playlistId, UUID userId) {
        var playlist = loadPlaylist(playlistId);
        checkAccess(playlist, userId);

        var items = playlistItemRepository.findByPlaylistIdOrderByPosition(playlistId)
                .stream().map(playlistItemMapper::toDto).toList();
        var collaborators = collaboratorRepository.findByPlaylistId(playlistId)
                .stream().map(collaboratorMapper::toDto).toList();

        boolean isOwner = userId != null && playlist.getOwnerId().equals(userId);
        boolean canEdit = isOwner || (userId != null && isEditor(playlistId, userId));
        return toDetail(playlist, items, collaborators, isOwner, canEdit);
    }

    public PlaylistDetailDto updatePlaylist(UUID playlistId, UUID userId, UpdatePlaylistRequest request) {
        var playlist = loadPlaylist(playlistId);
        verifyOwnership(playlist, userId);

        boolean wasNotPublic = playlist.getVisibility() != PlaylistVisibility.PUBLIC;

        if (request.name() != null) playlist.setName(request.name());
        if (request.description() != null) playlist.setDescription(request.description());
        if (request.visibility() != null) playlist.setVisibility(request.visibility());

        playlistRepository.save(playlist);

        if (wasNotPublic && playlist.getVisibility() == PlaylistVisibility.PUBLIC) {
            var event = new PlaylistSharedEvent(
                    EventHeader.create(PlaylistSharedEvent.EVENT_TYPE, "playlist-service"),
                    new PlaylistSharedEvent.Data(
                            playlist.getId().toString(),
                            playlist.getName(),
                            playlist.getOwnerId().toString(),
                            null,
                            null
                    )
            );
            outboxService.write(PlaylistSharedEvent.EVENT_TYPE,
                    EventConstants.Exchanges.PLAYLIST,
                    EventConstants.RoutingKeys.PLAYLIST_SHARED,
                    event);
        }

        var items = playlistItemRepository.findByPlaylistIdOrderByPosition(playlistId)
                .stream().map(playlistItemMapper::toDto).toList();
        var collaborators = collaboratorRepository.findByPlaylistId(playlistId)
                .stream().map(collaboratorMapper::toDto).toList();
        return toDetail(playlist, items, collaborators, true, true);
    }

    public void deletePlaylist(UUID playlistId, UUID userId) {
        var playlist = loadPlaylist(playlistId);
        verifyOwnership(playlist, userId);
        playlistRepository.delete(playlist);
    }

    // ---- Shared helpers used by other services ----

    public Playlist loadPlaylist(UUID playlistId) {
        return playlistRepository.findById(playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist not found: " + playlistId));
    }

    public void checkAccess(Playlist playlist, UUID userId) {
        if (playlist.getVisibility() == PlaylistVisibility.PRIVATE) {
            if (userId == null) throw new AccessDeniedException("Access denied to private playlist");
            if (!playlist.getOwnerId().equals(userId)
                    && !collaboratorRepository.existsByPlaylistIdAndUserId(playlist.getId(), userId)) {
                throw new AccessDeniedException("Access denied to private playlist");
            }
        }
        // PUBLIC and UNLISTED: open access
    }

    public boolean canEdit(UUID playlistId, UUID ownerId, UUID userId) {
        if (ownerId.equals(userId)) return true;
        return collaboratorRepository.findByPlaylistIdAndUserId(playlistId, userId)
                .map(c -> c.getRole() == CollaboratorRole.EDITOR)
                .orElse(false);
    }

    public void verifyOwnership(Playlist playlist, UUID userId) {
        if (!playlist.getOwnerId().equals(userId)) {
            throw new AccessDeniedException("Only the playlist owner can perform this action");
        }
    }

    private boolean isEditor(UUID playlistId, UUID userId) {
        return collaboratorRepository.findByPlaylistIdAndUserId(playlistId, userId)
                .map(c -> c.getRole() == CollaboratorRole.EDITOR)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public java.util.Set<String> getMyPlaylistTrackIds(UUID userId) {
        return playlistItemRepository.findTrackIdsByPlaylistOwner(userId)
                .stream().map(UUID::toString).collect(java.util.stream.Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public java.util.Set<String> getPlaylistsContainingTrack(UUID trackId, UUID userId) {
        return playlistItemRepository.findPlaylistIdsContainingTrack(trackId, userId)
                .stream().map(UUID::toString).collect(java.util.stream.Collectors.toSet());
    }

    private PlaylistSummaryDto toSummary(Playlist p) {
        return new PlaylistSummaryDto(p.getId(), p.getOwnerId(), p.getName(), p.getDescription(),
                p.getVisibility(), p.getTrackCount(), p.getTotalDurationMs(), p.getCoverUrl(),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    private PlaylistDetailDto toDetail(Playlist p, List<PlaylistItemDto> items,
                                        List<CollaboratorDto> collaborators,
                                        boolean isOwner, boolean canEdit) {
        return new PlaylistDetailDto(p.getId(), p.getOwnerId(), p.getName(), p.getDescription(),
                p.getVisibility(), p.getTrackCount(), p.getTotalDurationMs(),
                p.getCreatedAt(), p.getUpdatedAt(), items, collaborators, isOwner, canEdit);
    }
}
