package com.backoffice.backend.dto.user;

/** All fields optional - only non-null fields are applied (partial update / PATCH semantics). */
public record UserSettingsUpdateRequest(
        String name,
        String businessName,
        String phone,
        Boolean notifyPaymentReminders,
        Boolean notifyFollowUp
) {
}
