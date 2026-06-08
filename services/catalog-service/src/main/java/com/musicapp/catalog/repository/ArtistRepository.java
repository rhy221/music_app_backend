package com.musicapp.catalog.repository;

import com.musicapp.catalog.domain.Artist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ArtistRepository extends JpaRepository<Artist, UUID>, JpaSpecificationExecutor<Artist> {

    Optional<Artist> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
}
