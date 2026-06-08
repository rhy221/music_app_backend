package com.musicapp.user.web;

import com.musicapp.user.dto.request.BatchUserRequest;
import com.musicapp.user.dto.response.InternalUserDto;
import com.musicapp.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;

    @GetMapping("/{userId}")
    public InternalUserDto getInternalUser(@PathVariable UUID userId) {
        return userService.getInternalUser(userId);
    }

    @PostMapping("/batch")
    public Map<UUID, InternalUserDto> getInternalUsersBatch(@Valid @RequestBody BatchUserRequest request) {
        return userService.getInternalUsersBatch(request.userIds());
    }
}
