package com.backoffice.backend.dto.auth;

import java.util.UUID;

public record AuthResponse(
        String accessToken,
        long expiresInSeconds,
        UserSummary user
) {
    public record UserSummary(UUID id, String email, String name, String role) {
    }
}
