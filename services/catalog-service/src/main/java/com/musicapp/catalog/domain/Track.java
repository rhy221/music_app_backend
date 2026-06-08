package com.musicapp.catalog.domain;

import com.musicapp.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tracks", schema = "catalog_schema")
@NamedEntityGraph(
    name = "Track.withArtistAndAssets",
    attributeNodes = {
        @NamedAttributeNode("artist"),
        @NamedAttributeNode("album"),
        @NamedAttributeNode("assets")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Track extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artist_id", nullable = false)
    private Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "album_id")
    private Album album;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "duration_ms", nullable = false)
    private Integer durationMs;

    @Column(name = "genre", length = 50)
    private String genre;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(name = "waveform_url", length = 512)
    private String waveformUrl;

    @Column(name = "play_count", nullable = false)
    private Long playCount = 0L;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TrackStatus status = TrackStatus.PUBLISHED;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @OneToMany(mappedBy = "track", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AudioAsset> assets = new ArrayList<>();
}
