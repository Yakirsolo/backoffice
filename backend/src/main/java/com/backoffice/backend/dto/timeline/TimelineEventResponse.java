package com.backoffice.backend.dto.timeline;

import com.backoffice.backend.domain.entity.TimelineEvent;
import com.backoffice.backend.domain.entity.TimelineEventType;

import java.time.LocalDate;
import java.util.UUID;

public record TimelineEventResponse(
        UUID id,
        UUID customerId,
        TimelineEventType type,
        LocalDate date,
        String description
) {
    public static TimelineEventResponse from(TimelineEvent e) {
        return new TimelineEventResponse(e.getId(), e.getCustomerId(), e.getType(), e.getDate(), e.getDescription());
    }
}
