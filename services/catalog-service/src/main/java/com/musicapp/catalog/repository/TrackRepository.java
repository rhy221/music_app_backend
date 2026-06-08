package com.musicapp.catalog.repository;

import com.musicapp.catalog.domain.Track;
import com.musicapp.catalog.domain.TrackStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrackRepository extends JpaRepository<Track, UUID>, JpaSpecificationExecutor<Track> {

    @EntityGraph("Track.withArtistAndAssets")
    Optional<Track> findWithAssetsById(UUID id);

    List<Track> findByStatusOrderByPlayCountDesc(TrackStatus status, Pageable pageable);

    List<Track> findByStatusAndGenreOrderByPlayCountDesc(TrackStatus status, String genre, Pageable pageable);

    List<Track> findByArtistIdAndStatusOrderByPlayCountDesc(UUID artistId, TrackStatus status, Pageable pageable);

    List<Track> findByStatusOrderByCreatedAtDesc(TrackStatus status, Pageable pageable);

    @Query("SELECT t FROM Track t WHERE t.id IN :ids AND t.status = 'PUBLISHED'")
    @EntityGraph("Track.withArtistAndAssets")
    List<Track> findAllByIdInWithAssets(@Param("ids") List<UUID> ids);

    @Modifying
    @Query("UPDATE Track t SET t.playCount = t.playCount + :delta WHERE t.id = :id")
    void incrementPlayCount(@Param("id") UUID id, @Param("delta") long delta);

    long countByArtistId(UUID artistId);
}
