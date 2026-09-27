package com.backoffice.backend.dto.user;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;

/** All fields optional - only non-null fields are applied. */
public record UserSettingsUpdateRequest(
        String name,
        String businessName,
        String phone,
        String zoomPersonalLink,
        Integer meetingCadenceValue,
        BillingIntervalUnit meetingCadenceUnit,
        Boolean notifyPaymentReminders,
        Boolean notifyFollowUp
) {
}
