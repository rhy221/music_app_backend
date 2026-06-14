package com.musicapp.catalog.service;

import com.musicapp.catalog.domain.Album;
import com.musicapp.catalog.domain.Artist;
import com.musicapp.catalog.domain.Track;
import com.musicapp.catalog.domain.TrackStatus;
import com.musicapp.catalog.dto.mapper.AlbumMapper;
import com.musicapp.catalog.dto.mapper.TrackMapper;
import com.musicapp.catalog.dto.request.CreateAlbumRequest;
import com.musicapp.catalog.dto.request.UpdateAlbumRequest;
import com.musicapp.catalog.dto.response.AlbumDetailDto;
import com.musicapp.catalog.dto.response.AlbumSummaryDto;
import com.musicapp.catalog.dto.response.TrackSummaryDto;
import com.musicapp.catalog.repository.AlbumRepository;
import com.musicapp.catalog.repository.ArtistRepository;
import com.musicapp.catalog.repository.TrackRepository;
import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlbumService {

    private final AlbumRepository albumRepository;
    private final ArtistRepository artistRepository;
    private final TrackRepository trackRepository;
    private final AlbumMapper albumMapper;
    private final TrackMapper trackMapper;

    @Transactional(readOnly = true)
    public PaginatedResponse<AlbumSummaryDto> listAlbums(UUID artistId, Pageable pageable) {
        Page<Album> page = (artistId != null)
                ? albumRepository.findByArtistId(artistId, pageable)
                : albumRepository.findAll(pageable);
        return PaginationMapper.toResponse(page, albumMapper::toSummary);
    }

    @Transactional
    public AlbumSummaryDto createAlbum(CreateAlbumRequest req) {
        if (!CurrentUser.isArtist() && !CurrentUser.isAdmin()) {
            throw new AccessDeniedException("Only ARTIST role can create albums");
        }
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Artist profile not found for current user"));

        Album album = new Album();
        album.setArtist(artist);
        album.setTitle(req.title());
        album.setCoverUrl(req.coverUrl());
        album.setReleaseDate(req.releaseDate());

        return albumMapper.toSummary(albumRepository.save(album));
    }

    @Transactional(readOnly = true)
    public AlbumDetailDto getAlbumById(UUID albumId) {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new EntityNotFoundException("Album not found: " + albumId));

        List<Track> tracks = trackRepository.findByStatusOrderByCreatedAtDesc(
                TrackStatus.PUBLISHED,
                org.springframework.data.domain.PageRequest.of(0, 500));

        List<Track> albumTracks = tracks.stream()
                .filter(t -> t.getAlbum() != null && t.getAlbum().getId().equals(albumId))
                .toList();

        List<TrackSummaryDto> trackDtos = albumTracks.stream().map(trackMapper::toSummary).toList();
        long totalDuration = albumTracks.stream().mapToLong(t -> t.getDurationMs() != null ? t.getDurationMs() : 0).sum();

        TrackSummaryDto.ArtistRefDto artistRef = new TrackSummaryDto.ArtistRefDto(
                album.getArtist().getId(),
                album.getArtist().getName(),
                album.getArtist().getAvatarUrl()
        );

        return new AlbumDetailDto(
                album.getId(),
                album.getTitle(),
                album.getCoverUrl(),
                album.getReleaseDate(),
                album.getCreatedAt(),
                artistRef,
                trackDtos,
                totalDuration
        );
    }

    @Transactional
    public AlbumSummaryDto updateAlbum(UUID albumId, UpdateAlbumRequest req) {
        Album album = albumRepository.findById(albumId)
                .orElseThrow(() -> new EntityNotFoundException("Album not found: " + albumId));

        verifyOwnership(album);

        if (req.title()       != null) album.setTitle(req.title());
        if (req.coverUrl()    != null) album.setCoverUrl(req.coverUrl());
        if (req.releaseDate() != null) album.setReleaseDate(req.releaseDate());

        return albumMapper.toSummary(albumRepository.save(album));
    }

    @Transactional
    public void ensureAlbumExists(UUID albumId, String albumTitle, String coverUrl, UUID artistUserId) {
        Artist artist = artistRepository.findByUserId(artistUserId)
                .orElseThrow(() -> new EntityNotFoundException("Artist not found for user: " + artistUserId));
        albumRepository.insertIfAbsent(
                albumId,
                artist.getId(),
                albumTitle != null ? albumTitle : "Untitled Album",
                coverUrl
        );
    }

    private void verifyOwnership(Album album) {
        String currentUserId = CurrentUser.getUserId();
        boolean isAdmin = CurrentUser.isAdmin();
        boolean isOwner = album.getArtist().getUserId() != null &&
                          album.getArtist().getUserId().toString().equals(currentUserId);
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not own this album");
        }
    }
}
