package com.musicapp.library.service;

import com.musicapp.library.domain.FollowedPlaylist;
import com.musicapp.library.domain.SavedAlbum;
import com.musicapp.library.domain.SavedTrack;
import com.musicapp.library.dto.request.FollowPlaylistRequest;
import com.musicapp.library.dto.request.SaveAlbumRequest;
import com.musicapp.library.dto.request.SaveTrackRequest;
import com.musicapp.library.dto.response.FollowedPlaylistDto;
import com.musicapp.library.dto.response.SavedAlbumDto;
import com.musicapp.library.dto.response.SavedTrackDto;
import com.musicapp.library.repository.FollowedPlaylistRepository;
import com.musicapp.library.repository.SavedAlbumRepository;
import com.musicapp.library.repository.SavedTrackRepository;
import com.musicapp.library.service.client.CatalogClient;
import com.musicapp.library.service.client.PlaylistClient;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LibraryService {

    private final SavedAlbumRepository savedAlbumRepository;
    private final FollowedPlaylistRepository followedPlaylistRepository;
    private final SavedTrackRepository savedTrackRepository;
    private final CatalogClient catalogClient;
    private final PlaylistClient playlistClient;

    // ── Albums ────────────────────────────────────────────────────────────────

    @Transactional
    public SavedAlbumDto saveAlbum(UUID userId, SaveAlbumRequest req) {
        UUID albumId = req.albumId();
        if (savedAlbumRepository.existsByUserIdAndAlbumId(userId, albumId)) {
            return savedAlbumRepository.findByUserIdAndAlbumId(userId, albumId)
                    .map(this::toAlbumDto)
                    .orElseThrow();
        }

        CatalogClient.InternalAlbumDto remote = catalogClient.getAlbum(albumId);

        SavedAlbum entity = new SavedAlbum();
        entity.setUserId(userId);
        entity.setAlbumId(UUID.fromString(remote.albumId()));
        entity.setAlbumTitle(remote.title());
        entity.setCoverUrl(remote.coverUrl());
        entity.setArtistId(UUID.fromString(remote.artistId()));
        entity.setArtistName(remote.artistName());
        entity.setTrackCount(remote.trackCount());

        return toAlbumDto(savedAlbumRepository.save(entity));
    }

    @Transactional
    public void unsaveAlbum(UUID userId, UUID albumId) {
        SavedAlbum entity = savedAlbumRepository.findByUserIdAndAlbumId(userId, albumId)
                .orElseThrow(() -> new EntityNotFoundException("Album not in library"));
        savedAlbumRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public Page<SavedAlbumDto> listSavedAlbums(UUID userId, Pageable pageable) {
        return savedAlbumRepository.findByUserIdOrderBySavedAtDesc(userId, pageable)
                .map(this::toAlbumDto);
    }

    @Transactional(readOnly = true)
    public Map<String, Boolean> isAlbumSaved(UUID userId, UUID albumId) {
        return Map.of("saved", savedAlbumRepository.existsByUserIdAndAlbumId(userId, albumId));
    }

    // ── Playlists ─────────────────────────────────────────────────────────────

    @Transactional
    public FollowedPlaylistDto followPlaylist(UUID userId, FollowPlaylistRequest req) {
        UUID playlistId = req.playlistId();
        if (followedPlaylistRepository.existsByUserIdAndPlaylistId(userId, playlistId)) {
            return followedPlaylistRepository.findByUserIdAndPlaylistId(userId, playlistId)
                    .map(this::toPlaylistDto)
                    .orElseThrow();
        }

        PlaylistClient.InternalPlaylistDto remote = playlistClient.getPlaylist(playlistId);

        if (remote.ownerId().equals(userId.toString())) {
            throw new IllegalArgumentException("Cannot follow your own playlist");
        }

        FollowedPlaylist entity = new FollowedPlaylist();
        entity.setUserId(userId);
        entity.setPlaylistId(UUID.fromString(remote.playlistId()));
        entity.setOwnerId(UUID.fromString(remote.ownerId()));
        entity.setPlaylistName(remote.name());
        entity.setCoverUrl(remote.coverUrl());
        entity.setTrackCount(remote.trackCount());

        return toPlaylistDto(followedPlaylistRepository.save(entity));
    }

    @Transactional
    public void unfollowPlaylist(UUID userId, UUID playlistId) {
        FollowedPlaylist entity = followedPlaylistRepository.findByUserIdAndPlaylistId(userId, playlistId)
                .orElseThrow(() -> new EntityNotFoundException("Playlist not in library"));
        followedPlaylistRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public Page<FollowedPlaylistDto> listFollowedPlaylists(UUID userId, Pageable pageable) {
        return followedPlaylistRepository.findByUserIdOrderByFollowedAtDesc(userId, pageable)
                .map(this::toPlaylistDto);
    }

    @Transactional(readOnly = true)
    public Map<String, Boolean> isPlaylistFollowed(UUID userId, UUID playlistId) {
        return Map.of("followed", followedPlaylistRepository.existsByUserIdAndPlaylistId(userId, playlistId));
    }

    // ── Tracks ────────────────────────────────────────────────────────────────

    @Transactional
    public SavedTrackDto saveTrack(UUID userId, SaveTrackRequest req) {
        UUID trackId = req.trackId();
        if (savedTrackRepository.existsByUserIdAndTrackId(userId, trackId)) {
            return savedTrackRepository.findByUserIdAndTrackId(userId, trackId)
                    .map(this::toTrackDto)
                    .orElseThrow();
        }

        CatalogClient.InternalTrackDto remote = catalogClient.getTrack(trackId);

        int nextPosition = savedTrackRepository.findMaxPositionByUserId(userId) + 1;

        SavedTrack entity = new SavedTrack();
        entity.setUserId(userId);
        entity.setTrackId(UUID.fromString(remote.id()));
        entity.setTrackTitle(remote.title());
        entity.setCoverUrl(remote.coverUrl());
        entity.setArtistId(remote.artistId() != null ? UUID.fromString(remote.artistId()) : null);
        entity.setArtistName(remote.artistName());
        entity.setDurationMs(remote.durationMs());
        entity.setAlbumId(remote.albumId() != null ? UUID.fromString(remote.albumId()) : null);
        entity.setAlbumTitle(remote.albumTitle());
        entity.setPosition(nextPosition);

        return toTrackDto(savedTrackRepository.save(entity));
    }

    @Transactional
    public void unsaveTrack(UUID userId, UUID trackId) {
        SavedTrack entity = savedTrackRepository.findByUserIdAndTrackId(userId, trackId)
                .orElseThrow(() -> new EntityNotFoundException("Track not in library"));
        savedTrackRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public Page<SavedTrackDto> listSavedTracks(UUID userId, Pageable pageable) {
        return savedTrackRepository.findByUserIdAndDeletedFalseOrderByPositionAsc(userId, pageable)
                .map(this::toTrackDto);
    }

    @Transactional(readOnly = true)
    public Map<String, Boolean> isTrackSaved(UUID userId, UUID trackId) {
        return Map.of("saved", savedTrackRepository.existsByUserIdAndTrackId(userId, trackId));
    }

    @Transactional
    public void reorderSavedTracks(UUID userId, List<UUID> trackIds) {
        List<SavedTrack> nonDeleted = savedTrackRepository.findByUserIdAndDeletedFalse(userId);

        Map<UUID, SavedTrack> byTrackId = new HashMap<>();
        for (var t : nonDeleted) byTrackId.put(t.getTrackId(), t);

        if (!new HashSet<>(trackIds).equals(byTrackId.keySet())) {
            throw new IllegalArgumentException("trackIds must contain exactly all saved tracks");
        }

        List<SavedTrack> toSave = new ArrayList<>();
        for (int i = 0; i < trackIds.size(); i++) {
            SavedTrack track = byTrackId.get(trackIds.get(i));
            track.setPosition(i);
            toSave.add(track);
        }
        savedTrackRepository.saveAll(toSave);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private SavedAlbumDto toAlbumDto(SavedAlbum e) {
        return new SavedAlbumDto(e.getId(), e.getAlbumId(), e.getAlbumTitle(),
                e.getCoverUrl(), e.getArtistName(), e.getArtistId(), e.getTrackCount(), e.getSavedAt());
    }

    private FollowedPlaylistDto toPlaylistDto(FollowedPlaylist e) {
        return new FollowedPlaylistDto(e.getId(), e.getPlaylistId(), e.getPlaylistName(),
                e.getCoverUrl(), e.getOwnerId(), e.getOwnerName(), e.getTrackCount(), e.getFollowedAt());
    }

    private SavedTrackDto toTrackDto(SavedTrack e) {
        return new SavedTrackDto(e.getId(), e.getTrackId(), e.getTrackTitle(),
                e.getCoverUrl(), e.getArtistName(), e.getArtistId(), e.getDurationMs(),
                e.getAlbumId(), e.getAlbumTitle(), e.isDeleted(), e.getSavedAt(), e.getPosition());
    }
}
