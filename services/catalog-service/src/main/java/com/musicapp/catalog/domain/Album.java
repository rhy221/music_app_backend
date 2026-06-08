package com.musicapp.catalog.domain;

import com.musicapp.common.persistence.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "albums", schema = "catalog_schema")
@Getter
@Setter
@NoArgsConstructor
public class Album extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "artist_id", nullable = false)
    private Artist artist;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    @Column(name = "release_date")
    private LocalDate releaseDate;
}
