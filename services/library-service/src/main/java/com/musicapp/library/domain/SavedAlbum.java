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
    name = "saved_albums",
    schema = "library_schema",
    uniqueConstraints = @UniqueConstraint(name = "uq_saved_album", columnNames = {"user_id", "album_id"})
)
@Getter
@Setter
@NoArgsConstructor
public class SavedAlbum extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "album_id", nullable = false)
    private UUID albumId;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt = Instant.now();

    @Column(name = "album_title", length = 255)
    private String albumTitle;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(name = "artist_name", length = 100)
    private String artistName;

    @Column(name = "artist_id")
    private UUID artistId;

    @Column(name = "track_count")
    private int trackCount;
}
