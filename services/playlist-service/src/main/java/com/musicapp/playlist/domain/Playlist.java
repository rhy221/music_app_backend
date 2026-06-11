package com.musicapp.playlist.domain;

import com.musicapp.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "playlists", schema = "playlist_schema")
@Getter
@Setter
@NoArgsConstructor
public class Playlist extends BaseEntity {

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private PlaylistVisibility visibility = PlaylistVisibility.PRIVATE;

    @Column(name = "track_count", nullable = false)
    private int trackCount = 0;

    @Column(name = "total_duration_ms", nullable = false)
    private long totalDurationMs = 0L;

    @Column(name = "cover_url")
    private String coverUrl;
}
