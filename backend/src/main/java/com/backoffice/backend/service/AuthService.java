package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.repository.UserRepository;
import com.backoffice.backend.dto.auth.AuthResponse;
import com.backoffice.backend.exception.UnauthorizedException;
import com.backoffice.backend.security.JwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public TokenPair login(String email, String password) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password");
        }

        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        return issueTokens(user);
    }

    public TokenPair refresh(String refreshToken) {
        if (refreshToken == null) {
            throw new UnauthorizedException("Missing refresh token");
        }
        Claims claims;
        try {
            claims = jwtService.parseClaims(refreshToken);
        } catch (Exception e) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        if (!jwtService.isRefreshToken(claims)) {
            throw new UnauthorizedException("Invalid token type");
        }

        AppUser user = userRepository.findById(jwtService.getUserId(claims))
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));

        return issueTokens(user);
    }

    private TokenPair issueTokens(AppUser user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String newRefreshToken = jwtService.generateRefreshToken(user.getId(), user.getEmail());
        AuthResponse response = new AuthResponse(
                accessToken,
                jwtService.getAccessTokenMinutes() * 60,
                new AuthResponse.UserSummary(user.getId(), user.getEmail(), user.getName(), user.getRole().name())
        );
        return new TokenPair(response, newRefreshToken);
    }

    public record TokenPair(AuthResponse response, String refreshToken) {
    }
}
