package com.backoffice.backend.web;

import com.backoffice.backend.dto.timeline.TimelineEventResponse;
import com.backoffice.backend.service.TimelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/timeline")
@RequiredArgsConstructor
public class TimelineController {

    private final TimelineService timelineService;

    @GetMapping
    public List<TimelineEventResponse> list(@PathVariable UUID customerId) {
        return timelineService.getTimeline(customerId);
    }
}
