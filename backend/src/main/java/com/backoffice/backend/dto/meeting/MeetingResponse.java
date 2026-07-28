package com.backoffice.backend.dto.meeting;

import com.backoffice.backend.domain.entity.Meeting;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record MeetingResponse(
        UUID id,
        UUID customerId,
        LocalDate date,
        LocalTime time,
        String type,
        Integer durationMinutes,
        String notes,
        String zoomLink,
        boolean completed,
        boolean reminderEnabled
) {
    public static MeetingResponse from(Meeting m) {
        return new MeetingResponse(
                m.getId(), m.getCustomerId(), m.getDate(), m.getTime(), m.getType(),
                m.getDurationMinutes(), m.getNotes(), m.getZoomLink(), m.isCompleted(), m.isReminderEnabled()
        );
    }
}
