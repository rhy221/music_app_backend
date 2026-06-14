package com.musicapp.library.repository;

import com.musicapp.library.domain.SavedAlbum;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface SavedAlbumRepository extends JpaRepository<SavedAlbum, UUID> {

    Optional<SavedAlbum> findByUserIdAndAlbumId(UUID userId, UUID albumId);

    boolean existsByUserIdAndAlbumId(UUID userId, UUID albumId);

    Page<SavedAlbum> findByUserIdOrderBySavedAtDesc(UUID userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM SavedAlbum s WHERE s.albumId = :albumId")
    void deleteAllByAlbumId(@Param("albumId") UUID albumId);
}
