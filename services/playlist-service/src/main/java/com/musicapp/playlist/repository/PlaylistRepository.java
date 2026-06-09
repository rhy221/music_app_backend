package com.musicapp.playlist.repository;

import com.musicapp.playlist.domain.Playlist;
import com.musicapp.playlist.domain.PlaylistVisibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {

    @Query("""
        SELECT p FROM Playlist p
        WHERE p.ownerId = :userId
           OR p.id IN (
               SELECT c.playlistId FROM Collaborator c WHERE c.userId = :userId
           )
        ORDER BY p.updatedAt DESC
        """)
    Page<Playlist> findAllByUserIdAsOwnerOrCollaborator(@Param("userId") UUID userId, Pageable pageable);

    Page<Playlist> findByOwnerIdAndVisibility(UUID ownerId, PlaylistVisibility visibility, Pageable pageable);
}
