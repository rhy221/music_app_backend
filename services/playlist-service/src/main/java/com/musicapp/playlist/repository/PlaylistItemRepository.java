package com.musicapp.playlist.repository;

import com.musicapp.playlist.domain.PlaylistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlaylistItemRepository extends JpaRepository<PlaylistItem, UUID> {

    List<PlaylistItem> findByPlaylistIdOrderByPosition(UUID playlistId);

    Optional<PlaylistItem> findByIdAndPlaylistId(UUID id, UUID playlistId);

    boolean existsByPlaylistIdAndTrackId(UUID playlistId, UUID trackId);

    @Modifying
    @Query("UPDATE PlaylistItem i SET i.position = i.position + 1 WHERE i.playlistId = :playlistId AND i.position >= :fromPosition")
    void shiftPositionsUp(@Param("playlistId") UUID playlistId, @Param("fromPosition") int fromPosition);

    @Modifying
    @Query("UPDATE PlaylistItem i SET i.position = i.position - 1 WHERE i.playlistId = :playlistId AND i.position > :deletedPosition")
    void shiftPositionsDown(@Param("playlistId") UUID playlistId, @Param("deletedPosition") int deletedPosition);

    @Modifying
    @Query("""
        UPDATE PlaylistItem i
        SET i.trackTitle = :title, i.trackCoverUrl = :coverUrl, i.artistName = :artistName
        WHERE i.trackId = :trackId
        """)
    void updateDenormalizedTrackInfo(
            @Param("trackId") UUID trackId,
            @Param("title") String title,
            @Param("coverUrl") String coverUrl,
            @Param("artistName") String artistName);

    @Modifying
    @Query("UPDATE PlaylistItem i SET i.trackTitle = '[Deleted]', i.trackCoverUrl = null WHERE i.trackId = :trackId")
    void markTrackAsDeleted(@Param("trackId") UUID trackId);

    void deleteByPlaylistId(UUID playlistId);

    @Query("SELECT i.trackCoverUrl FROM PlaylistItem i WHERE i.playlistId = :playlistId ORDER BY i.position ASC LIMIT 1")
    java.util.Optional<String> findFirstCoverUrlByPlaylistId(@Param("playlistId") UUID playlistId);

    java.util.Optional<PlaylistItem> findByPlaylistIdAndTrackId(UUID playlistId, UUID trackId);

    @Query("""
        SELECT DISTINCT i.trackId FROM PlaylistItem i
        WHERE i.playlistId IN (SELECT p.id FROM Playlist p WHERE p.ownerId = :userId)
        """)
    java.util.Set<UUID> findTrackIdsByPlaylistOwner(@Param("userId") UUID userId);

    @Query("""
        SELECT i.playlistId FROM PlaylistItem i
        WHERE i.trackId = :trackId
        AND i.playlistId IN (SELECT p.id FROM Playlist p WHERE p.ownerId = :userId)
        """)
    java.util.Set<UUID> findPlaylistIdsContainingTrack(@Param("trackId") UUID trackId, @Param("userId") UUID userId);
}
