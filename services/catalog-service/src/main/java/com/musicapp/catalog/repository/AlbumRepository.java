package com.musicapp.catalog.repository;

import com.musicapp.catalog.domain.Album;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlbumRepository extends JpaRepository<Album, UUID> {

    Page<Album> findByArtistId(UUID artistId, Pageable pageable);

    List<Album> findByArtistIdOrderByReleaseDateDesc(UUID artistId);

    Optional<Album> findByIdAndArtistUserId(UUID albumId, UUID userId);
}
