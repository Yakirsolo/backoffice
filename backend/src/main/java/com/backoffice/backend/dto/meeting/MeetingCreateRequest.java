package com.backoffice.backend.dto.meeting;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record MeetingCreateRequest(
        @NotNull LocalDate date,
        @NotNull LocalTime time,
        @NotBlank String type,
        Integer durationMinutes,
        String zoomLink,
        Boolean reminderEnabled
) {
}
