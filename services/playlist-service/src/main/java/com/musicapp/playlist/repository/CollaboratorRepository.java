package com.musicapp.playlist.repository;

import com.musicapp.playlist.domain.Collaborator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollaboratorRepository extends JpaRepository<Collaborator, UUID> {

    List<Collaborator> findByPlaylistId(UUID playlistId);

    Optional<Collaborator> findByPlaylistIdAndUserId(UUID playlistId, UUID userId);

    boolean existsByPlaylistIdAndUserId(UUID playlistId, UUID userId);

    void deleteByPlaylistIdAndUserId(UUID playlistId, UUID userId);
}
