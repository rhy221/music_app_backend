package com.musicapp.user.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "follows", schema = "user_schema")
@Getter
@NoArgsConstructor
public class Follow {

    @EmbeddedId
    private FollowId id;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    public Follow(FollowId id) {
        this.id = id;
    }
}
