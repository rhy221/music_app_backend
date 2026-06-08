package com.musicapp.user.web;

import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.user.dto.request.UpdateUserRoleRequest;
import com.musicapp.user.dto.response.UserProfileDto;
import com.musicapp.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public PaginatedResponse<UserProfileDto> listAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.listAllUsers(role, search,
                PageRequest.of(page, Math.min(size, 100), Sort.by("createdAt").descending()));
    }

    @PutMapping("/{userId}/role")
    public UserProfileDto updateUserRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        return userService.updateUserRole(userId, request);
    }
}
