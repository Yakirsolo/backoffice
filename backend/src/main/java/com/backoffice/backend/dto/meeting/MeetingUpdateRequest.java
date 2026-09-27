package com.backoffice.backend.dto.meeting;

import java.time.LocalDate;
import java.time.LocalTime;

/** All fields optional - only non-null fields are applied. */
public record MeetingUpdateRequest(
        LocalDate date,
        LocalTime time,
        Integer durationMinutes,
        String type,
        Boolean completed,
        String notes,
        String zoomLink
) {
}
