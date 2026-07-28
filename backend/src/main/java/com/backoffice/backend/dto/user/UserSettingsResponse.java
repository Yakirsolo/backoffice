package com.backoffice.backend.dto.user;

import com.backoffice.backend.domain.entity.AppUser;

public record UserSettingsResponse(
        String name,
        String businessName,
        String email,
        String phone,
        boolean notifyPaymentReminders,
        boolean notifyFollowUp
) {
    public static UserSettingsResponse from(AppUser user) {
        return new UserSettingsResponse(
                user.getName(), user.getBusinessName(), user.getEmail(), user.getPhone(),
                user.isNotifyPaymentReminders(), user.isNotifyFollowUp()
        );
    }
}
