package com.backoffice.backend.dto.meeting;

/** All fields optional - only non-null fields are applied. */
public record MeetingUpdateRequest(
        Boolean completed,
        String notes,
        String zoomLink
) {
}
