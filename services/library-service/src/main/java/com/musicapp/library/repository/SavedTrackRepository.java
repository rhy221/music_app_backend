package com.musicapp.library.repository;

import com.musicapp.library.domain.SavedTrack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedTrackRepository extends JpaRepository<SavedTrack, UUID> {

    Optional<SavedTrack> findByUserIdAndTrackId(UUID userId, UUID trackId);

    boolean existsByUserIdAndTrackId(UUID userId, UUID trackId);

    Page<SavedTrack> findByUserIdAndDeletedFalseOrderByPositionAsc(UUID userId, Pageable pageable);

    List<SavedTrack> findByUserIdAndDeletedFalse(UUID userId);

    @Query("SELECT COALESCE(MAX(s.position), -1) FROM SavedTrack s WHERE s.userId = :userId")
    int findMaxPositionByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE SavedTrack s SET s.deleted = true WHERE s.trackId = :trackId")
    void markAllDeletedByTrackId(@Param("trackId") UUID trackId);

    @Modifying
    @Query("""
        UPDATE SavedTrack s
        SET s.trackTitle = :title, s.coverUrl = :coverUrl, s.artistName = :artistName
        WHERE s.trackId = :trackId
        """)
    void updateDenormalizedData(
            @Param("trackId") UUID trackId,
            @Param("title") String title,
            @Param("coverUrl") String coverUrl,
            @Param("artistName") String artistName
    );
}
