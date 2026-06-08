package com.musicapp.user.repository;

import com.musicapp.user.domain.Follow;
import com.musicapp.user.domain.FollowId;
import com.musicapp.user.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {

    long countByIdFollowingId(UUID followingId);

    long countByIdFollowerId(UUID followerId);

    boolean existsByIdFollowerIdAndIdFollowingId(UUID followerId, UUID followingId);

    @Query(value = """
            SELECT u.* FROM user_schema.users u
            JOIN user_schema.follows f ON u.id = f.follower_id
            WHERE f.following_id = :followingId
            ORDER BY f.created_at DESC
            """,
            countQuery = "SELECT COUNT(*) FROM user_schema.follows WHERE following_id = :followingId",
            nativeQuery = true)
    Page<User> findFollowersByFollowingId(@Param("followingId") UUID followingId, Pageable pageable);

    @Query(value = """
            SELECT u.* FROM user_schema.users u
            JOIN user_schema.follows f ON u.id = f.following_id
            WHERE f.follower_id = :followerId
            ORDER BY f.created_at DESC
            """,
            countQuery = "SELECT COUNT(*) FROM user_schema.follows WHERE follower_id = :followerId",
            nativeQuery = true)
    Page<User> findFollowingByFollowerId(@Param("followerId") UUID followerId, Pageable pageable);
}
