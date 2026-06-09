package com.musicapp.playlist.web;

import com.musicapp.common.web.PaginatedResponse;
import com.musicapp.playlist.dto.response.PlaylistSummaryDto;
import com.musicapp.playlist.service.CollaboratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/{userId}/playlists")
@RequiredArgsConstructor
public class UserPlaylistController {

    private final CollaboratorService collaboratorService;

    @GetMapping
    public PaginatedResponse<PlaylistSummaryDto> getUserPublicPlaylists(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("updatedAt").descending());
        return collaboratorService.getUserPublicPlaylists(userId, pageable);
    }
}
