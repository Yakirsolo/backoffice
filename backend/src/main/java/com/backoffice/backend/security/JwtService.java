package com.backoffice.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String TOKEN_TYPE_CLAIM = "type";
    private static final String ACCESS_TYPE = "access";
    private static final String REFRESH_TYPE = "refresh";

    private final SecretKey key;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
    }

    public String generateAccessToken(UUID userId, String email) {
        return buildToken(userId, email, ACCESS_TYPE, Instant.now().plus(accessTokenMinutes, ChronoUnit.MINUTES));
    }

    public String generateRefreshToken(UUID userId, String email) {
        return buildToken(userId, email, REFRESH_TYPE, Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS));
    }

    public long getAccessTokenMinutes() {
        return accessTokenMinutes;
    }

    public long getRefreshTokenDays() {
        return refreshTokenDays;
    }

    private String buildToken(UUID userId, String email, String type, Instant expiry) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim(TOKEN_TYPE_CLAIM, type)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isAccessToken(Claims claims) {
        return ACCESS_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return REFRESH_TYPE.equals(claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    public UUID getUserId(Claims claims) {
        return UUID.fromString(claims.getSubject());
    }
}
