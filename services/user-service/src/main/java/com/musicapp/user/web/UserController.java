package com.musicapp.user.web;

import com.musicapp.common.security.CurrentUser;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.user.dto.request.ChangePasswordRequest;
import com.musicapp.user.dto.request.UpdateProfileRequest;
import com.musicapp.user.dto.response.PublicUserProfileDto;
import com.musicapp.user.dto.response.UserProfileDto;
import com.musicapp.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserProfileDto getCurrentUser() {
        return userService.getCurrentUser(currentUserId());
    }

    @PatchMapping("/me")
    public UserProfileDto updateCurrentUser(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateCurrentUser(currentUserId(), request);
    }

    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String url = userService.uploadAvatar(currentUserId(), file);
        return Map.of("avatarUrl", url);
    }

    @PutMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(currentUserId(), request);
    }

    @GetMapping("/{userId}")
    public PublicUserProfileDto getUserById(
            @PathVariable UUID userId,
            @RequestHeader(value = "X-User-Id", required = false) UUID callerId) {
        return userService.getUserById(userId, callerId);
    }

    @PostMapping("/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void followUser(@PathVariable UUID userId) {
        userService.followUser(currentUserId(), userId);
    }

    @DeleteMapping("/{userId}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollowUser(@PathVariable UUID userId) {
        userService.unfollowUser(currentUserId(), userId);
    }

    private UUID currentUserId() {
        return UUID.fromString(CurrentUser.getUserId());
    }

    @GetMapping("/{userId}/followers")
    public PaginatedResponse<UserProfileDto> getFollowers(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.getFollowers(userId, PageRequest.of(page, Math.min(size, 100)));
    }

    @GetMapping("/{userId}/following")
    public PaginatedResponse<UserProfileDto> getFollowing(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.getFollowing(userId, PageRequest.of(page, Math.min(size, 100)));
    }
}
