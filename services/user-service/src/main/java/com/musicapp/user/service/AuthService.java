package com.musicapp.user.service;

import com.company.events.EventHeader;
import com.company.events.EventConstants;
import com.company.events.user.UserRegisteredEvent;
import com.musicapp.common.security.JwtUtil;
import com.musicapp.user.domain.*;
import com.musicapp.user.dto.mapper.UserMapper;
import com.musicapp.user.dto.request.*;
import com.musicapp.user.dto.response.AuthResponse;
import com.musicapp.user.dto.response.UserProfileDto;
import com.musicapp.user.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final OAuthAccountRepository oauthAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OutboxService outboxService;
    private final UserMapper userMapper;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RestClient restClient;

    @Value("${jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    @Value("${google.oauth2.token-info-url:https://oauth2.googleapis.com/tokeninfo}")
    private String googleTokenInfoUrl;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        User user = new User();
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setDisplayName(req.displayName());
        user.setRole(UserRole.LISTENER);
        userRepository.save(user);

        AuthResponse response = issueTokens(user);

        var event = new UserRegisteredEvent(
                EventHeader.create(UserRegisteredEvent.EVENT_TYPE, "user-service"),
                new UserRegisteredEvent.Data(user.getId().toString(), user.getDisplayName(), user.getEmail())
        );
        outboxService.write(UserRegisteredEvent.EVENT_TYPE,
                EventConstants.Exchanges.USER,
                EventConstants.RoutingKeys.USER_REGISTERED,
                event);

        return response;
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest req) {
        RefreshToken storedToken = refreshTokenRepository.findByTokenAndRevokedFalse(req.refreshToken())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or revoked refresh token"));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
        }

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenRepository.findByTokenAndRevokedFalse(rawRefreshToken)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    refreshTokenRepository.save(token);
                });
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public AuthResponse loginWithGoogle(OAuth2GoogleRequest req) {
        Map<String, Object> tokenInfo;
        try {
            tokenInfo = restClient.get()
                    .uri(googleTokenInfoUrl + "?id_token={token}", req.idToken())
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Google token verification failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google ID token");
        }

        if (tokenInfo == null || tokenInfo.get("sub") == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google ID token");
        }

        String providerId = (String) tokenInfo.get("sub");
        String email      = (String) tokenInfo.get("email");
        String name       = (String) tokenInfo.getOrDefault("name", email);
        String picture    = (String) tokenInfo.get("picture");

        return oauthAccountRepository.findByProviderAndProviderId("google", providerId)
                .map(account -> {
                    User existing = userRepository.findById(account.getUserId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "User linked to OAuth account not found"));
                    return issueTokens(existing);
                })
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email != null ? email : providerId + "@google.oauth");
                    newUser.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                    newUser.setDisplayName(name);
                    newUser.setAvatarUrl(picture);
                    newUser.setEmailVerified(true);
                    newUser.setRole(UserRole.LISTENER);
                    userRepository.save(newUser);

                    OAuthAccount account = new OAuthAccount();
                    account.setUserId(newUser.getId());
                    account.setProvider("google");
                    account.setProviderId(providerId);
                    oauthAccountRepository.save(account);

                    var event = new UserRegisteredEvent(
                            EventHeader.create(UserRegisteredEvent.EVENT_TYPE, "user-service"),
                            new UserRegisteredEvent.Data(newUser.getId().toString(), newUser.getDisplayName(), newUser.getEmail())
                    );
                    outboxService.write(UserRegisteredEvent.EVENT_TYPE,
                            EventConstants.Exchanges.USER,
                            EventConstants.RoutingKeys.USER_REGISTERED,
                            event);

                    return issueTokens(newUser);
                });
    }

    // -------------------------------------------------------------------------

    private AuthResponse issueTokens(User user) {
        String accessToken  = jwtUtil.generateAccessToken(user.getId().toString(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId().toString());

        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setToken(refreshToken);
        rt.setExpiresAt(Instant.now().plusMillis(refreshTokenExpiration));
        refreshTokenRepository.save(rt);

        UserProfileDto profile = new UserProfileDto(
                user.getId(), user.getEmail(), user.getDisplayName(),
                user.getAvatarUrl(), user.getBio(), user.getRole(),
                0L, 0L, user.getCreatedAt()
        );
        return AuthResponse.of(accessToken, refreshToken, refreshTokenExpiration / 1000, profile);
    }
}
