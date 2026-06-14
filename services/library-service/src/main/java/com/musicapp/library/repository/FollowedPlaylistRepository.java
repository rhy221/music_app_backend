package com.musicapp.library.repository;

import com.musicapp.library.domain.FollowedPlaylist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FollowedPlaylistRepository extends JpaRepository<FollowedPlaylist, UUID> {

    Optional<FollowedPlaylist> findByUserIdAndPlaylistId(UUID userId, UUID playlistId);

    boolean existsByUserIdAndPlaylistId(UUID userId, UUID playlistId);

    Page<FollowedPlaylist> findByUserIdOrderByFollowedAtDesc(UUID userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM FollowedPlaylist f WHERE f.playlistId = :playlistId")
    void deleteAllByPlaylistId(@Param("playlistId") UUID playlistId);
}
