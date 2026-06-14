package com.musicapp.catalog.service;

import com.musicapp.catalog.domain.Artist;
import com.musicapp.catalog.domain.TrackStatus;
import com.musicapp.catalog.dto.mapper.AlbumMapper;
import com.musicapp.catalog.dto.mapper.ArtistMapper;
import com.musicapp.catalog.dto.mapper.TrackMapper;
import com.musicapp.catalog.dto.request.UpdateArtistRequest;
import com.musicapp.catalog.dto.response.AlbumSummaryDto;
import com.musicapp.catalog.dto.response.ArtistDetailDto;
import com.musicapp.catalog.dto.response.ArtistSummaryDto;
import com.musicapp.catalog.dto.response.TrackSummaryDto;
import com.musicapp.catalog.repository.AlbumRepository;
import com.musicapp.catalog.repository.ArtistRepository;
import com.musicapp.catalog.repository.TrackRepository;
import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArtistService {

    private final ArtistRepository artistRepository;
    private final AlbumRepository albumRepository;
    private final TrackRepository trackRepository;
    private final ArtistMapper artistMapper;
    private final AlbumMapper albumMapper;
    private final TrackMapper trackMapper;

    public PaginatedResponse<ArtistSummaryDto> listArtists(Pageable pageable) {
        return PaginationMapper.toResponse(artistRepository.findAll(pageable), artist -> {
            long trackCount = trackRepository.countByArtistId(artist.getId());
            long albumCount = albumRepository.findByArtistIdOrderByReleaseDateDesc(artist.getId()).size();
            return new ArtistSummaryDto(artist.getId(), artist.getName(), artist.getAvatarUrl(), trackCount, albumCount);
        });
    }

    @Transactional(readOnly = true)
    public ArtistDetailDto getArtistById(UUID artistId) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new EntityNotFoundException("Artist not found: " + artistId));

        long trackCount = trackRepository.countByArtistId(artistId);
        long albumCount = albumRepository.findByArtistIdOrderByReleaseDateDesc(artistId).size();

        List<TrackSummaryDto> topTracks = trackRepository
                .findByArtistIdAndStatusOrderByPlayCountDesc(artistId, TrackStatus.PUBLISHED, PageRequest.of(0, 10))
                .stream()
                .map(trackMapper::toSummary)
                .toList();

        List<AlbumSummaryDto> albums = albumRepository
                .findByArtistIdOrderByReleaseDateDesc(artistId)
                .stream()
                .map(albumMapper::toSummary)
                .toList();

        return new ArtistDetailDto(
                artist.getId(),
                artist.getName(),
                artist.getBio(),
                artist.getAvatarUrl(),
                artist.getUserId(),
                trackCount,
                albumCount,
                artist.getCreatedAt(),
                topTracks,
                albums
        );
    }

    @Transactional
    public ArtistSummaryDto updateArtist(UUID artistId, UpdateArtistRequest req) {
        Artist artist = artistRepository.findById(artistId)
                .orElseThrow(() -> new EntityNotFoundException("Artist not found: " + artistId));

        String currentUserId = CurrentUser.getUserId();
        boolean isAdmin = CurrentUser.isAdmin();
        boolean isOwner = artist.getUserId() != null &&
                          artist.getUserId().toString().equals(currentUserId);
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not own this artist profile");
        }

        if (req.name()      != null) artist.setName(req.name());
        if (req.bio()       != null) artist.setBio(req.bio());
        if (req.avatarUrl() != null) artist.setAvatarUrl(req.avatarUrl());

        Artist saved = artistRepository.save(artist);
        long trackCount = trackRepository.countByArtistId(artistId);
        long albumCount = albumRepository.findByArtistIdOrderByReleaseDateDesc(artistId).size();
        return new ArtistSummaryDto(saved.getId(), saved.getName(), saved.getAvatarUrl(), trackCount, albumCount);
    }

    @Transactional(readOnly = true)
    public ArtistDetailDto getMyArtist() {
        UUID userId = UUID.fromString(CurrentUser.getUserId());
        Artist artist = artistRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("No artist profile for current user"));
        return getArtistById(artist.getId());
    }

    @Transactional
    public void createArtistForUser(UUID userId, String displayName) {
        if (artistRepository.existsByUserId(userId)) {
            return; // idempotent
        }
        Artist artist = new Artist();
        artist.setUserId(userId);
        artist.setName(displayName);
        artistRepository.save(artist);
    }
}
