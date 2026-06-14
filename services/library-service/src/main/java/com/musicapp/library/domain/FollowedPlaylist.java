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
    name = "followed_playlists",
    schema = "library_schema",
    uniqueConstraints = @UniqueConstraint(name = "uq_followed_playlist", columnNames = {"user_id", "playlist_id"})
)
@Getter
@Setter
@NoArgsConstructor
public class FollowedPlaylist extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "playlist_id", nullable = false)
    private UUID playlistId;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "followed_at", nullable = false)
    private Instant followedAt = Instant.now();

    @Column(name = "playlist_name", length = 100)
    private String playlistName;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(name = "owner_name", length = 100)
    private String ownerName;

    @Column(name = "track_count")
    private int trackCount;
}
