package com.musicapp.playlist.service;

import com.company.events.EventConstants;
import com.company.events.EventHeader;
import com.company.events.playlist.PlaylistTrackAddedEvent;
import com.musicapp.playlist.domain.Playlist;
import com.musicapp.playlist.domain.PlaylistItem;
import com.musicapp.playlist.dto.request.AddTrackRequest;
import com.musicapp.playlist.dto.request.ReorderRequest;
import com.musicapp.playlist.dto.response.PlaylistItemDto;
import com.musicapp.playlist.repository.CollaboratorRepository;
import com.musicapp.playlist.repository.PlaylistItemRepository;
import com.musicapp.playlist.repository.PlaylistRepository;
import com.musicapp.playlist.service.client.CatalogInternalClient;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlaylistItemService {

    private final PlaylistRepository playlistRepository;
    private final PlaylistItemRepository itemRepository;
    private final CollaboratorRepository collaboratorRepository;
    private final CatalogInternalClient catalogClient;
    private final PlaylistService playlistService;
    private final OutboxService outboxService;

    @Transactional
    public PlaylistItemDto addTrack(UUID playlistId, UUID userId, AddTrackRequest request) {
        var playlist = playlistService.loadPlaylist(playlistId);
        playlistService.checkAccess(playlist, userId);

        if (!playlistService.canEdit(playlistId, playlist.getOwnerId(), userId)) {
            throw new AccessDeniedException("You do not have edit permission for this playlist");
        }

        if (playlist.getTrackCount() >= 1000) {
            throw new IllegalStateException("Playlist is full (max 1000 tracks)");
        }

        // Validate track exists and fetch metadata
        var track = catalogClient.getTrack(request.trackId());

        // Determine insert position
        int position = (request.position() != null)
                ? request.position()
                : playlist.getTrackCount();

        if (request.position() != null) {
            itemRepository.shiftPositionsUp(playlistId, position);
        }

        var item = new PlaylistItem();
        item.setPlaylistId(playlistId);
        item.setTrackId(request.trackId());
        item.setPosition(position);
        item.setAddedBy(userId);
        item.setTrackTitle(track.title());
        item.setTrackDuration(track.durationMs());
        item.setTrackCoverUrl(track.coverUrl());
        item.setArtistName(track.artistName());
        item.setArtistId(track.artistId());
        item.setAlbumId(track.albumId());
        item.setAlbumTitle(track.albumTitle());
        itemRepository.save(item);

        // Update aggregate counters + cover
        playlist.setTrackCount(playlist.getTrackCount() + 1);
        playlist.setTotalDurationMs(playlist.getTotalDurationMs()
                + (track.durationMs() != null ? track.durationMs() : 0));
        if (position == 0 || playlist.getCoverUrl() == null) {
            playlist.setCoverUrl(track.coverUrl());
        }
        playlistRepository.save(playlist);

        // Publish event for notification fan-out
        List<String> collaboratorIds = collaboratorRepository.findByPlaylistId(playlistId)
                .stream().map(c -> c.getUserId().toString()).toList();

        var event = new PlaylistTrackAddedEvent(
                EventHeader.create(PlaylistTrackAddedEvent.EVENT_TYPE, "playlist-service"),
                new PlaylistTrackAddedEvent.Data(
                        playlistId.toString(),
                        playlist.getName(),
                        request.trackId().toString(),
                        track.title(),
                        userId.toString(),
                        null,
                        collaboratorIds
                )
        );
        outboxService.write(PlaylistTrackAddedEvent.EVENT_TYPE,
                EventConstants.Exchanges.PLAYLIST,
                EventConstants.RoutingKeys.PLAYLIST_TRACK_ADDED,
                event);

        return new PlaylistItemDto(item.getId(), item.getTrackId(), item.getPosition(),
                item.getAddedBy(), item.getAddedAt(), item.getTrackTitle(),
                item.getTrackDuration(), item.getTrackCoverUrl(), item.getArtistName(),
                item.getArtistId(), item.getAlbumId(), item.getAlbumTitle(), false);
    }

    @Transactional
    public void removeTrack(UUID playlistId, UUID itemId, UUID userId) {
        var playlist = playlistService.loadPlaylist(playlistId);
        playlistService.checkAccess(playlist, userId);

        if (!playlistService.canEdit(playlistId, playlist.getOwnerId(), userId)) {
            throw new AccessDeniedException("You do not have edit permission for this playlist");
        }

        var item = itemRepository.findByIdAndPlaylistId(itemId, playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + itemId));

        int deletedPosition = item.getPosition();
        int duration = item.getTrackDuration() != null ? item.getTrackDuration() : 0;
        itemRepository.delete(item);

        itemRepository.shiftPositionsDown(playlistId, deletedPosition);

        playlist.setTrackCount(Math.max(0, playlist.getTrackCount() - 1));
        playlist.setTotalDurationMs(Math.max(0, playlist.getTotalDurationMs() - duration));
        if (deletedPosition == 0) {
            playlist.setCoverUrl(itemRepository.findFirstCoverUrlByPlaylistId(playlistId).orElse(null));
        }
        playlistRepository.save(playlist);
    }

    @Transactional
    public void removeTrackByTrackId(UUID playlistId, UUID trackId, UUID userId) {
        var item = itemRepository.findByPlaylistIdAndTrackId(playlistId, trackId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Track not in playlist: " + trackId));
        removeTrack(playlistId, item.getId(), userId);
    }

    @Transactional
    public void reorderItems(UUID playlistId, UUID userId, ReorderRequest request) {
        var playlist = playlistService.loadPlaylist(playlistId);
        playlistService.checkAccess(playlist, userId);

        if (!playlistService.canEdit(playlistId, playlist.getOwnerId(), userId)) {
            throw new AccessDeniedException("You do not have edit permission for this playlist");
        }

        var currentItems = itemRepository.findByPlaylistIdOrderByPosition(playlistId);
        var currentIds = new HashSet<UUID>();
        for (var item : currentItems) currentIds.add(item.getId());

        var requestedIds = new HashSet<>(request.itemIds());
        if (!currentIds.equals(requestedIds)) {
            throw new IllegalArgumentException("itemIds must contain exactly all current playlist items");
        }

        var itemMap = new java.util.HashMap<UUID, PlaylistItem>();
        for (var item : currentItems) itemMap.put(item.getId(), item);

        var toSave = new java.util.ArrayList<PlaylistItem>();
        List<UUID> orderedIds = request.itemIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            var item = itemMap.get(orderedIds.get(i));
            item.setPosition(i);
            toSave.add(item);
        }
        itemRepository.saveAll(toSave);

        // Cover is the first item after reorder
        if (!orderedIds.isEmpty()) {
            var firstItem = itemMap.get(orderedIds.get(0));
            var reorderedPlaylist = playlistService.loadPlaylist(playlistId);
            reorderedPlaylist.setCoverUrl(firstItem.getTrackCoverUrl());
            playlistRepository.save(reorderedPlaylist);
        }
    }
}
