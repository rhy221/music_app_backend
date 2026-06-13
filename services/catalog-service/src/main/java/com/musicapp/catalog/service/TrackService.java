package com.musicapp.catalog.service;

import com.company.events.EventHeader;
import com.company.events.EventConstants;
import com.company.events.track.TrackDeletedEvent;
import com.company.events.track.TrackPublishedEvent;
import com.company.events.track.TrackUpdatedEvent;
import com.musicapp.catalog.domain.Album;
import com.musicapp.catalog.domain.Artist;
import com.musicapp.catalog.domain.AudioAsset;
import com.musicapp.catalog.domain.Track;
import com.musicapp.catalog.domain.TrackStatus;
import com.musicapp.catalog.dto.request.PublishTrackRequest;
import com.musicapp.catalog.dto.request.UpdateTrackRequest;
import com.musicapp.catalog.dto.response.InternalTrackDto;
import com.musicapp.catalog.dto.response.TrackDetailDto;
import com.musicapp.catalog.dto.response.TrackSummaryDto;
import com.musicapp.catalog.dto.mapper.TrackMapper;
import com.musicapp.catalog.repository.AlbumRepository;
import com.musicapp.catalog.repository.ArtistRepository;
import com.musicapp.catalog.repository.TrackRepository;
import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrackService {

    private final TrackRepository trackRepository;
    private final ArtistRepository artistRepository;
    private final AlbumRepository albumRepository;
    private final TrackMapper trackMapper;
    private final OutboxService outboxService;
    private final ArtistService artistService;

    public PaginatedResponse<TrackSummaryDto> listTracks(
            String genre, UUID artistId, UUID userId, UUID albumId, String sort, Pageable pageable) {

        // resolve userId → artistId so we can reuse the same spec
        if (userId != null && artistId == null) {
            artistId = artistRepository.findByUserId(userId)
                    .map(Artist::getId)
                    .orElse(null);
        }

        Specification<Track> spec = Specification.where(statusPublished());
        if (genre    != null) spec = spec.and(genreEquals(genre));
        if (artistId != null) spec = spec.and(artistIdEquals(artistId));
        if (albumId  != null) spec = spec.and(albumIdEquals(albumId));

        Sort sortOrder = switch (sort == null ? "newest" : sort) {
            case "popular"    -> Sort.by(Sort.Direction.DESC, "playCount");
            case "oldest"     -> Sort.by(Sort.Direction.ASC,  "createdAt");
            case "title_asc"  -> Sort.by(Sort.Direction.ASC,  "title");
            case "title_desc" -> Sort.by(Sort.Direction.DESC, "title");
            default           -> Sort.by(Sort.Direction.DESC, "createdAt"); // newest
        };

        Pageable sortedPageable = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(), sortOrder);

        return PaginationMapper.toResponse(
                trackRepository.findAll(spec, sortedPageable), trackMapper::toSummary);
    }

    public TrackDetailDto getTrackById(UUID trackId) {
        Track track = trackRepository.findWithAssetsById(trackId)
                .orElseThrow(() -> new EntityNotFoundException("Track not found: " + trackId));
        return trackMapper.toDetail(track);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "tracks:popular",      allEntries = true),
        @CacheEvict(cacheNames = "tracks:new-releases", allEntries = true)
    })
    public TrackDetailDto updateTrack(UUID trackId, UpdateTrackRequest req) {
        Track track = trackRepository.findWithAssetsById(trackId)
                .orElseThrow(() -> new EntityNotFoundException("Track not found: " + trackId));

        verifyOwnership(track);

        if (req.title()       != null) track.setTitle(req.title());
        if (req.genre()       != null) track.setGenre(req.genre());
        if (req.releaseDate() != null) track.setReleaseDate(req.releaseDate());
        if (req.albumId()     != null) {
            Album album = albumRepository.findById(req.albumId())
                    .orElseThrow(() -> new EntityNotFoundException("Album not found: " + req.albumId()));
            track.setAlbum(album);
        }

        trackRepository.save(track);

        outboxService.write(
                TrackUpdatedEvent.EVENT_TYPE,
                EventConstants.Exchanges.CATALOG,
                EventConstants.RoutingKeys.TRACK_UPDATED,
                new TrackUpdatedEvent(
                        EventHeader.create(TrackUpdatedEvent.EVENT_TYPE, "catalog-service"),
                        new TrackUpdatedEvent.Data(
                                track.getId().toString(),
                                track.getTitle(),
                                track.getGenre(),
                                track.getCoverUrl(),
                                track.getArtist().getName()
                        )
                )
        );

        return trackMapper.toDetail(track);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "tracks:popular",      allEntries = true),
        @CacheEvict(cacheNames = "tracks:new-releases", allEntries = true)
    })
    public void deleteTrack(UUID trackId) {
        Track track = trackRepository.findById(trackId)
                .orElseThrow(() -> new EntityNotFoundException("Track not found: " + trackId));

        verifyOwnership(track);

        track.setStatus(TrackStatus.ARCHIVED);
        trackRepository.save(track);

        outboxService.write(
                TrackDeletedEvent.EVENT_TYPE,
                EventConstants.Exchanges.CATALOG,
                EventConstants.RoutingKeys.TRACK_DELETED,
                new TrackDeletedEvent(
                        EventHeader.create(TrackDeletedEvent.EVENT_TYPE, "catalog-service"),
                        new TrackDeletedEvent.Data(track.getId().toString())
                )
        );
    }

    public List<TrackSummaryDto> getPopularTracks(int limit, String genre, String period) {
        Pageable pageable = PageRequest.of(0, Math.min(limit, 50));

        List<Track> tracks = (genre != null && !genre.isBlank())
                ? trackRepository.findByStatusAndGenreOrderByPlayCountDesc(TrackStatus.PUBLISHED, genre, pageable)
                : trackRepository.findByStatusOrderByPlayCountDesc(TrackStatus.PUBLISHED, pageable);

        if (period != null && !period.equals("all")) {
            LocalDate cutoff = switch (period) {
                case "day"   -> LocalDate.now().minusDays(1);
                case "week"  -> LocalDate.now().minusWeeks(1);
                case "month" -> LocalDate.now().minusMonths(1);
                default      -> null;
            };
            if (cutoff != null) {
                LocalDate finalCutoff = cutoff;
                tracks = tracks.stream()
                        .filter(t -> t.getCreatedAt() != null &&
                                t.getCreatedAt().isAfter(finalCutoff.atStartOfDay().toInstant(java.time.ZoneOffset.UTC)))
                        .collect(Collectors.toList());
            }
        }

        return tracks.stream().map(trackMapper::toSummary).toList();
    }

    public List<TrackSummaryDto> getNewReleases(int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(limit, 50));
        return trackRepository.findByStatusOrderByCreatedAtDesc(TrackStatus.PUBLISHED, pageable)
                .stream().map(trackMapper::toSummary).toList();
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "tracks:popular",      allEntries = true),
        @CacheEvict(cacheNames = "tracks:new-releases", allEntries = true)
    })
    public TrackDetailDto publishTrack(PublishTrackRequest req) {
        Artist artist = artistRepository.findByUserId(req.uploaderId())
                .orElseGet(() -> {
                    artistService.createArtistForUser(
                            req.uploaderId(),
                            "User-" + req.uploaderId().toString().substring(0, 8));
                    return artistRepository.findByUserId(req.uploaderId())
                            .orElseThrow(() -> new IllegalStateException(
                                    "Failed to create artist for uploader: " + req.uploaderId()));
                });

        Album album = null;
        if (req.albumId() != null) {
            album = albumRepository.findById(req.albumId()).orElse(null);
        }

        Track track = new Track();
        track.setArtist(artist);
        track.setAlbum(album);
        track.setTitle(req.title());
        track.setDurationMs(req.durationMs());
        track.setGenre(req.genre());
        track.setCoverUrl(req.coverUrl());
        track.setWaveformUrl(req.waveformUrl());
        track.setStatus(TrackStatus.PUBLISHED);

        for (PublishTrackRequest.AssetRequest a : req.assets()) {
            AudioAsset asset = new AudioAsset();
            asset.setTrack(track);
            asset.setBitrate(a.bitrate());
            asset.setFormat(a.format());
            asset.setStorageUrl(a.storageUrl());
            asset.setSizeBytes(a.sizeBytes());
            track.getAssets().add(asset);
        }

        track = trackRepository.save(track);

        List<TrackPublishedEvent.AudioAsset> eventAssets = track.getAssets().stream()
                .map(a -> new TrackPublishedEvent.AudioAsset(a.getBitrate(), a.getFormat(), a.getStorageUrl()))
                .toList();

        outboxService.write(
                TrackPublishedEvent.EVENT_TYPE,
                EventConstants.Exchanges.CATALOG,
                EventConstants.RoutingKeys.TRACK_PUBLISHED,
                new TrackPublishedEvent(
                        EventHeader.create(TrackPublishedEvent.EVENT_TYPE, "catalog-service"),
                        new TrackPublishedEvent.Data(
                                track.getId().toString(),
                                req.uploadJobId(),
                                track.getTitle(),
                                track.getDurationMs(),
                                track.getCoverUrl(),
                                track.getGenre(),
                                artist.getId().toString(),
                                artist.getName(),
                                album != null ? album.getId().toString() : null,
                                album != null ? album.getTitle() : null,
                                eventAssets
                        )
                )
        );

        return trackMapper.toDetail(track);
    }

    public InternalTrackDto getInternalTrack(UUID trackId) {
        Track track = trackRepository.findWithAssetsById(trackId)
                .orElseThrow(() -> new EntityNotFoundException("Track not found: " + trackId));
        return trackMapper.toInternal(track);
    }

    public Map<UUID, InternalTrackDto> getInternalTracksBatch(List<UUID> ids) {
        if (ids.size() > 200) {
            throw new IllegalArgumentException("Batch size must not exceed 200");
        }
        return trackRepository.findAllByIdInWithAssets(ids).stream()
                .map(trackMapper::toInternal)
                .collect(Collectors.toMap(InternalTrackDto::id, Function.identity()));
    }

    // --- Specifications ---

    private static Specification<Track> statusPublished() {
        return (root, query, cb) -> cb.equal(root.get("status"), TrackStatus.PUBLISHED);
    }

    private static Specification<Track> genreEquals(String genre) {
        return (root, query, cb) -> cb.equal(root.get("genre"), genre);
    }

    private static Specification<Track> artistIdEquals(UUID artistId) {
        return (root, query, cb) -> cb.equal(root.get("artist").get("id"), artistId);
    }

    private static Specification<Track> albumIdEquals(UUID albumId) {
        return (root, query, cb) -> cb.equal(root.get("album").get("id"), albumId);
    }

    // --- Helpers ---

    private void verifyOwnership(Track track) {
        String currentUserId = CurrentUser.getUserId();
        boolean isAdmin  = CurrentUser.isAdmin();
        boolean isOwner  = track.getArtist().getUserId() != null &&
                           track.getArtist().getUserId().toString().equals(currentUserId);
        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("You do not own this track");
        }
    }
}
