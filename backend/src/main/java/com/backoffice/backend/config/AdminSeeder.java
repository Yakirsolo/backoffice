package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.UserRole;
import com.backoffice.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the first admin account on startup if no user exists yet.
 * There is no public registration endpoint by design - this is the only way an account gets created.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed-email}")
    private String seedEmail;

    @Value("${app.admin.seed-password}")
    private String seedPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        AppUser admin = new AppUser();
        admin.setEmail(seedEmail);
        admin.setPasswordHash(passwordEncoder.encode(seedPassword));
        admin.setName("Coach");
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);
        log.info("Seeded initial admin user: {}", seedEmail);
    }
}
