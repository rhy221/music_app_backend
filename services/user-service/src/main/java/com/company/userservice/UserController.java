package com.company.userservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class UserController {

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@RequestBody Map<String, String> request) {
        return Map.of(
                "accessToken", "eyJhbGciOiJIUzI1NiJ9.mock-access-token",
                "refreshToken", "mock-refresh-token-" + UUID.randomUUID(),
                "expiresIn", 3600,
                "user", Map.of(
                        "userId", UUID.randomUUID().toString(),
                        "email", request.getOrDefault("email", "user@example.com"),
                        "displayName", request.getOrDefault("displayName", "New User"),
                        "role", "LISTENER",
                        "createdAt", "2024-01-01T00:00:00Z"
                )
        );
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Map<String, String> request) {
        return Map.of(
                "accessToken", "eyJhbGciOiJIUzI1NiJ9.mock-access-token",
                "refreshToken", "mock-refresh-token-" + UUID.randomUUID(),
                "expiresIn", 3600,
                "user", Map.of(
                        "userId", "user-001",
                        "email", request.getOrDefault("email", "user@example.com"),
                        "displayName", "Mock User",
                        "role", "LISTENER"
                )
        );
    }

    @PostMapping("/auth/refresh")
    public Map<String, Object> refresh(@RequestBody Map<String, String> request) {
        return Map.of(
                "accessToken", "eyJhbGciOiJIUzI1NiJ9.new-mock-access-token",
                "expiresIn", 3600
        );
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
    }

    @PostMapping("/auth/oauth2/google")
    public Map<String, Object> googleOAuth(@RequestBody Map<String, String> request) {
        return Map.of(
                "accessToken", "eyJhbGciOiJIUzI1NiJ9.mock-google-access-token",
                "refreshToken", "mock-refresh-token-" + UUID.randomUUID(),
                "expiresIn", 3600,
                "user", Map.of(
                        "userId", "user-google-001",
                        "email", request.getOrDefault("email", "google@example.com"),
                        "displayName", "Google User",
                        "role", "LISTENER"
                )
        );
    }

    @GetMapping("/users/me")
    public Map<String, Object> getCurrentUser() {
        return Map.of(
                "userId", "user-001",
                "email", "user@example.com",
                "displayName", "Mock User",
                "role", "LISTENER",
                "bio", "Music enthusiast from Hanoi",
                "followerCount", 120,
                "followingCount", 85,
                "createdAt", "2024-01-01T00:00:00Z"
        );
    }

    @PatchMapping("/users/me")
    public Map<String, Object> updateCurrentUser(@RequestBody Map<String, Object> request) {
        return Map.of(
                "userId", "user-001",
                "email", "user@example.com",
                "displayName", request.getOrDefault("displayName", "Mock User"),
                "bio", request.getOrDefault("bio", ""),
                "role", "LISTENER"
        );
    }

    @GetMapping("/users/{userId}")
    public Map<String, Object> getUserProfile(@PathVariable String userId) {
        return Map.of(
                "userId", userId,
                "displayName", "Public User",
                "bio", "Music enthusiast",
                "followerCount", 50,
                "followingCount", 30
        );
    }

    @PostMapping("/users/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void followUser(@PathVariable String userId) {
    }

    @DeleteMapping("/users/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollowUser(@PathVariable String userId) {
    }

    @GetMapping("/users/{userId}/followers")
    public Map<String, Object> getFollowers(@PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Map.of("items", List.of(), "total", 0, "page", page, "size", size);
    }

    @GetMapping("/users/{userId}/following")
    public Map<String, Object> getFollowing(@PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Map.of("items", List.of(), "total", 0, "page", page, "size", size);
    }

    @GetMapping("/internal/users/{userId}")
    public Map<String, Object> getInternalUser(@PathVariable String userId) {
        return Map.of(
                "userId", userId,
                "displayName", "Mock User",
                "role", "LISTENER",
                "active", true
        );
    }
}
