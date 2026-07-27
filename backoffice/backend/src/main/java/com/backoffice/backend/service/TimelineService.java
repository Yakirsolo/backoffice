package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.TimelineEvent;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.TimelineEventRepository;
import com.backoffice.backend.dto.timeline.TimelineEventResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimelineService {

    private final TimelineEventRepository timelineEventRepository;

    public void record(UUID customerId, TimelineEventType type, LocalDate date, String description) {
        timelineEventRepository.save(new TimelineEvent(customerId, type, date, description));
    }

    public List<TimelineEventResponse> getTimeline(UUID customerId) {
        return timelineEventRepository.findByCustomerIdOrderByDateDescCreatedAtDesc(customerId).stream()
                .map(TimelineEventResponse::from)
                .toList();
    }
}
