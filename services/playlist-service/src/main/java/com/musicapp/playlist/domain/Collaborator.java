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
    name = "collaborators",
    schema = "playlist_schema",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_playlist_collaborator",
        columnNames = {"playlist_id", "user_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
public class Collaborator extends BaseEntity {

    @Column(name = "playlist_id", nullable = false)
    private UUID playlistId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private CollaboratorRole role;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    // Denormalized from User service
    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;
}
