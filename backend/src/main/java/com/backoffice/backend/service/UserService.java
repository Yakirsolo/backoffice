package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.repository.UserRepository;
import com.backoffice.backend.dto.user.UserSettingsResponse;
import com.backoffice.backend.dto.user.UserSettingsUpdateRequest;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserSettingsResponse getSettings(UUID userId) {
        return UserSettingsResponse.from(getEntityOrThrow(userId));
    }

    @Transactional
    public UserSettingsResponse updateSettings(UUID userId, UserSettingsUpdateRequest request) {
        AppUser user = getEntityOrThrow(userId);

        if (request.name() != null) user.setName(request.name());
        if (request.businessName() != null) user.setBusinessName(request.businessName());
        if (request.phone() != null) user.setPhone(request.phone());
        if (request.notifyPaymentReminders() != null) user.setNotifyPaymentReminders(request.notifyPaymentReminders());
        if (request.notifyFollowUp() != null) user.setNotifyFollowUp(request.notifyFollowUp());

        return UserSettingsResponse.from(userRepository.save(user));
    }

    private AppUser getEntityOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
    }
}
