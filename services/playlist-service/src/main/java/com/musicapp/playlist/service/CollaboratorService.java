package com.musicapp.playlist.service;

import com.company.events.EventConstants;
import com.company.events.EventHeader;
import com.company.events.playlist.CollaboratorAddedEvent;
import com.musicapp.playlist.domain.Collaborator;
import com.musicapp.playlist.domain.PlaylistVisibility;
import com.musicapp.playlist.dto.mapper.CollaboratorMapper;
import com.musicapp.playlist.dto.request.AddCollaboratorRequest;
import com.musicapp.playlist.dto.response.CollaboratorDto;
import com.musicapp.playlist.dto.response.PlaylistSummaryDto;
import com.musicapp.playlist.repository.CollaboratorRepository;
import com.musicapp.playlist.repository.PlaylistRepository;
import com.musicapp.playlist.service.client.UserInternalClient;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
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
public class CollaboratorService {

    private final CollaboratorRepository collaboratorRepository;
    private final PlaylistRepository playlistRepository;
    private final UserInternalClient userClient;
    private final PlaylistService playlistService;
    private final OutboxService outboxService;
    private final CollaboratorMapper collaboratorMapper;

    @Transactional(readOnly = true)
    public List<CollaboratorDto> getCollaborators(UUID playlistId, UUID userId) {
        var playlist = playlistService.loadPlaylist(playlistId);
        playlistService.checkAccess(playlist, userId);
        return collaboratorRepository.findByPlaylistId(playlistId)
                .stream().map(collaboratorMapper::toDto).toList();
    }

    @Transactional
    public CollaboratorDto addCollaborator(UUID playlistId, UUID ownerId, AddCollaboratorRequest request) {
        var playlist = playlistService.loadPlaylist(playlistId);
        playlistService.verifyOwnership(playlist, ownerId);

        var user = userClient.getUser(request.userId());

        var collaborator = new Collaborator();
        collaborator.setPlaylistId(playlistId);
        collaborator.setUserId(request.userId());
        collaborator.setRole(request.role());
        collaborator.setDisplayName(user.displayName());
        collaborator.setAvatarUrl(user.avatarUrl());
        collaboratorRepository.save(collaborator);

        var event = new CollaboratorAddedEvent(
                EventHeader.create(CollaboratorAddedEvent.EVENT_TYPE, "playlist-service"),
                new CollaboratorAddedEvent.Data(
                        playlistId.toString(),
                        playlist.getName(),
                        ownerId.toString(),
                        request.userId().toString(),
                        request.role().name()
                )
        );
        outboxService.write(CollaboratorAddedEvent.EVENT_TYPE,
                EventConstants.Exchanges.PLAYLIST,
                EventConstants.RoutingKeys.COLLABORATOR_ADDED,
                event);

        return collaboratorMapper.toDto(collaborator);
    }

    @Transactional
    public void removeCollaborator(UUID playlistId, UUID requesterId, UUID targetUserId) {
        var playlist = playlistService.loadPlaylist(playlistId);
        boolean isOwner = playlist.getOwnerId().equals(requesterId);
        boolean isSelf = requesterId.equals(targetUserId);
        if (!isOwner && !isSelf) {
            throw new AccessDeniedException("Only the playlist owner or the collaborator themselves can remove a collaborator");
        }
        collaboratorRepository.deleteByPlaylistIdAndUserId(playlistId, targetUserId);
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<PlaylistSummaryDto> getUserPublicPlaylists(UUID userId, Pageable pageable) {
        var page = playlistRepository.findByOwnerIdAndVisibility(userId, PlaylistVisibility.PUBLIC, pageable);
        return PaginationMapper.toResponse(page, p -> new PlaylistSummaryDto(
                p.getId(), p.getOwnerId(), p.getName(), p.getDescription(),
                p.getVisibility(), p.getTrackCount(), p.getTotalDurationMs(), p.getCoverUrl(),
                p.getCreatedAt(), p.getUpdatedAt()));
    }
}
