package com.musicapp.playlist.domain;

import com.musicapp.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "playlist_items",
    schema = "playlist_schema",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_playlist_track",
        columnNames = {"playlist_id", "track_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
public class PlaylistItem extends BaseEntity {

    @Column(name = "playlist_id", nullable = false)
    private UUID playlistId;

    @Column(name = "track_id", nullable = false)
    private UUID trackId;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "added_by", nullable = false)
    private UUID addedBy;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt = Instant.now();

    // Denormalized from Catalog (kept fresh by TrackUpdatedEvent consumer)
    @Column(name = "track_title", length = 255)
    private String trackTitle;

    @Column(name = "track_duration")
    private Integer trackDuration;

    @Column(name = "track_cover_url", length = 512)
    private String trackCoverUrl;

    @Column(name = "artist_name", length = 100)
    private String artistName;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "album_id")
    private UUID albumId;

    @Column(name = "album_title", length = 255)
    private String albumTitle;
}
