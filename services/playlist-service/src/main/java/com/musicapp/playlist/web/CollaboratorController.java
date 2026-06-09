package com.musicapp.playlist.web;

import com.musicapp.common.security.CurrentUser;
import com.musicapp.playlist.dto.request.AddCollaboratorRequest;
import com.musicapp.playlist.dto.response.CollaboratorDto;
import com.musicapp.playlist.service.CollaboratorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/playlists/{playlistId}/collaborators")
@RequiredArgsConstructor
public class CollaboratorController {

    private final CollaboratorService collaboratorService;

    @GetMapping
    public List<CollaboratorDto> getCollaborators(
            @PathVariable UUID playlistId,
            Authentication authentication) {
        UUID userId = resolveOptionalUser(authentication);
        return collaboratorService.getCollaborators(playlistId, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CollaboratorDto addCollaborator(
            @PathVariable UUID playlistId,
            @Valid @RequestBody AddCollaboratorRequest request) {
        UUID ownerId = UUID.fromString(CurrentUser.getUserId());
        return collaboratorService.addCollaborator(playlistId, ownerId, request);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeCollaborator(
            @PathVariable UUID playlistId,
            @PathVariable UUID userId) {
        UUID requesterId = UUID.fromString(CurrentUser.getUserId());
        collaboratorService.removeCollaborator(playlistId, requesterId, userId);
    }

    private UUID resolveOptionalUser(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            return UUID.fromString((String) authentication.getPrincipal());
        }
        return null;
    }
}
