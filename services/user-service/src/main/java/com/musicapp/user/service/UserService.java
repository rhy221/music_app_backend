package com.musicapp.user.service;

import com.company.events.EventConstants;
import com.company.events.EventHeader;
import com.company.events.user.UserFollowedEvent;
import com.company.events.user.UserProfileUpdatedEvent;
import com.company.events.user.UserRoleUpdatedEvent;
import com.musicapp.common.persistence.BaseEntity;
import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.common.web.PaginationMapper;
import com.musicapp.user.domain.*;
import com.musicapp.user.dto.mapper.UserMapper;
import com.musicapp.user.dto.request.ChangePasswordRequest;
import com.musicapp.user.dto.request.UpdateProfileRequest;
import com.musicapp.user.dto.request.UpdateUserRoleRequest;
import com.musicapp.user.dto.response.InternalUserDto;
import com.musicapp.user.dto.response.PublicUserProfileDto;
import com.musicapp.user.dto.response.UserProfileDto;
import com.musicapp.user.config.StorageUrlResolver;
import com.musicapp.user.repository.*;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OutboxService outboxService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final MinioClient minioClient;
    private final com.musicapp.user.config.StorageUrlResolver storageUrlResolver;

    @Value("${minio.bucket.images:images}")
    private String imagesBucket;

    // -------------------------------------------------------------------------
    // Profile
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUser(UUID userId) {
        User user = findUserOrThrow(userId);
        long followers = followRepository.countByIdFollowingId(userId);
        long following = followRepository.countByIdFollowerId(userId);
        return buildProfile(user, followers, following);
    }

    @Transactional
    public UserProfileDto updateCurrentUser(UUID userId, UpdateProfileRequest req) {
        User user = findUserOrThrow(userId);
        boolean displayNameChanged = req.displayName() != null
                && !req.displayName().equals(user.getDisplayName());
        if (req.displayName() != null) user.setDisplayName(req.displayName());
        if (req.bio() != null) user.setBio(req.bio());
        userRepository.save(user);
        if (displayNameChanged) {
            var event = new UserProfileUpdatedEvent(
                    EventHeader.create(UserProfileUpdatedEvent.EVENT_TYPE, "user-service"),
                    new UserProfileUpdatedEvent.Data(userId.toString(), user.getDisplayName())
            );
            outboxService.write(UserProfileUpdatedEvent.EVENT_TYPE,
                    EventConstants.Exchanges.USER,
                    EventConstants.RoutingKeys.USER_PROFILE_UPDATED,
                    event);
        }
        long followers = followRepository.countByIdFollowingId(userId);
        long following = followRepository.countByIdFollowerId(userId);
        return buildProfile(user, followers, following);
    }

    @Transactional
    public String uploadAvatar(UUID userId, MultipartFile file) {
        validateImageFile(file);
        User user = findUserOrThrow(userId);

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Thumbnails.of(file.getInputStream())
                    .size(300, 300)
                    .outputFormat("jpg")
                    .toOutputStream(baos);

            byte[] resized = baos.toByteArray();
            String objectPath = "users/" + userId + "/avatar.jpg";

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(imagesBucket)
                    .object(objectPath)
                    .stream(new ByteArrayInputStream(resized), resized.length, -1)
                    .contentType("image/jpeg")
                    .build());

            user.setAvatarUrl(objectPath);
            userRepository.save(user);
            return storageUrlResolver.resolveAvatarUrl(objectPath);
        } catch (Exception e) {
            log.error("Avatar upload failed for userId={}: {}", userId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Avatar upload failed");
        }
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest req) {
        User user = findUserOrThrow(userId);
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        // Force re-login on all other devices
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    // -------------------------------------------------------------------------
    // Public profile
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PublicUserProfileDto getUserById(UUID userId, UUID callerId) {
        User user = findUserOrThrow(userId);
        long followers = followRepository.countByIdFollowingId(userId);
        long following = followRepository.countByIdFollowerId(userId);
        boolean isFollowing = callerId != null &&
                followRepository.existsByIdFollowerIdAndIdFollowingId(callerId, userId);
        return new PublicUserProfileDto(
                user.getId(), user.getDisplayName(), user.getAvatarUrl(),
                user.getRole(), followers, following, isFollowing
        );
    }

    // -------------------------------------------------------------------------
    // Follow / Unfollow
    // -------------------------------------------------------------------------

    @Transactional
    public void followUser(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot follow yourself");
        }
        User follower = findUserOrThrow(followerId);
        findUserOrThrow(followingId); // ensure target exists

        Follow follow = new Follow(new FollowId(followerId, followingId));
        followRepository.save(follow);

        var event = new UserFollowedEvent(
                EventHeader.create(UserFollowedEvent.EVENT_TYPE, "user-service"),
                new UserFollowedEvent.Data(followerId.toString(), follower.getDisplayName(), followingId.toString())
        );
        outboxService.write(UserFollowedEvent.EVENT_TYPE,
                EventConstants.Exchanges.USER,
                EventConstants.RoutingKeys.USER_FOLLOWED,
                event);
    }

    @Transactional
    public void unfollowUser(UUID followerId, UUID followingId) {
        followRepository.deleteById(new FollowId(followerId, followingId));
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<UserProfileDto> getFollowers(UUID userId, Pageable pageable) {
        Page<User> page = followRepository.findFollowersByFollowingId(userId, pageable);
        return PaginationMapper.toResponse(page, u -> buildPublicAsProfile(u, userId));
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<UserProfileDto> getFollowing(UUID userId, Pageable pageable) {
        Page<User> page = followRepository.findFollowingByFollowerId(userId, pageable);
        return PaginationMapper.toResponse(page, u -> buildPublicAsProfile(u, userId));
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PaginatedResponse<UserProfileDto> listAllUsers(String role, String search, Pageable pageable) {
        Specification<User> spec = Specification.where((Specification<User>) null);
        if (role != null && !role.isBlank()) {
            UserRole userRole = UserRole.valueOf(role.toUpperCase());
            spec = spec.and((root, q, cb) -> cb.equal(root.get("role"), userRole));
        }
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("displayName")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern)
            ));
        }
        Page<User> page = userRepository.findAll(spec, pageable);
        return PaginationMapper.toResponse(page, u -> buildProfile(u, 0L, 0L));
    }

    @Transactional
    public UserProfileDto updateUserRole(UUID userId, UpdateUserRoleRequest req) {
        User user = findUserOrThrow(userId);
        UserRole previous = user.getRole();
        user.setRole(req.role());
        userRepository.save(user);

        var event = new UserRoleUpdatedEvent(
                EventHeader.create(UserRoleUpdatedEvent.EVENT_TYPE, "user-service"),
                new UserRoleUpdatedEvent.Data(
                        userId.toString(), user.getDisplayName(),
                        req.role().name(), previous.name()
                )
        );
        outboxService.write(UserRoleUpdatedEvent.EVENT_TYPE,
                EventConstants.Exchanges.USER,
                EventConstants.RoutingKeys.USER_ROLE_UPDATED,
                event);

        return buildProfile(user, 0L, 0L);
    }

    // -------------------------------------------------------------------------
    // Internal (inter-service)
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public InternalUserDto getInternalUser(UUID userId) {
        return userMapper.toInternal(findUserOrThrow(userId));
    }

    @Transactional(readOnly = true)
    public Map<UUID, InternalUserDto> getInternalUsersBatch(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(BaseEntity::getId, userMapper::toInternal));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private User findUserOrThrow(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private UserProfileDto buildProfile(User user, long followers, long following) {
        return new UserProfileDto(
                user.getId(), user.getEmail(), user.getDisplayName(),
                user.getAvatarUrl(), user.getBio(), user.getRole(),
                followers, following, user.getCreatedAt()
        );
    }

    private UserProfileDto buildPublicAsProfile(User user, UUID callerId) {
        long followers = followRepository.countByIdFollowingId(user.getId());
        long following = followRepository.countByIdFollowerId(user.getId());
        return buildProfile(user, followers, following);
    }

    private void validateImageFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG and PNG files are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File size must not exceed 5MB");
        }
    }
}
