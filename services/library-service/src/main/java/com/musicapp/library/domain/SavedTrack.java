package com.musicapp.library.domain;

import com.musicapp.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "saved_tracks",
    schema = "library_schema",
    uniqueConstraints = @UniqueConstraint(name = "uq_saved_track", columnNames = {"user_id", "track_id"})
)
@Getter
@Setter
@NoArgsConstructor
public class SavedTrack extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "track_id", nullable = false)
    private UUID trackId;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt = Instant.now();

    @Column(name = "track_title", length = 255)
    private String trackTitle;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(name = "artist_name", length = 100)
    private String artistName;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "album_id")
    private UUID albumId;

    @Column(name = "album_title", length = 255)
    private String albumTitle;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "deleted", nullable = false)
    private boolean deleted = false;
}
