package com.musicapp.catalog.repository;

import com.musicapp.catalog.domain.Album;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlbumRepository extends JpaRepository<Album, UUID> {

    Page<Album> findByArtistId(UUID artistId, Pageable pageable);

    List<Album> findByArtistIdOrderByReleaseDateDesc(UUID artistId);

    Optional<Album> findByIdAndArtistUserId(UUID albumId, UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO catalog_schema.albums (id, artist_id, title, cover_url, created_at, updated_at)
            VALUES (:id, :artistId, :title, :coverUrl, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(
            @Param("id") UUID id,
            @Param("artistId") UUID artistId,
            @Param("title") String title,
            @Param("coverUrl") String coverUrl
    );
}
