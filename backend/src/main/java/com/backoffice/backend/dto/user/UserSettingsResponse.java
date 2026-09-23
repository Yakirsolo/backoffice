package com.backoffice.backend.dto.user;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;

public record UserSettingsResponse(
        String name,
        String businessName,
        String email,
        String phone,
        String zoomPersonalLink,
        int meetingCadenceValue,
        BillingIntervalUnit meetingCadenceUnit,
        boolean notifyPaymentReminders,
        boolean notifyFollowUp
) {
    public static UserSettingsResponse from(AppUser user) {
        return new UserSettingsResponse(
                user.getName(), user.getBusinessName(), user.getEmail(), user.getPhone(),
                user.getZoomPersonalLink(), user.getMeetingCadenceValue(), user.getMeetingCadenceUnit(),
                user.isNotifyPaymentReminders(), user.isNotifyFollowUp()
        );
    }
}
