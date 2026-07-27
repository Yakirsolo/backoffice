package com.backoffice.backend.web;

import com.backoffice.backend.dto.meeting.MeetingCreateRequest;
import com.backoffice.backend.dto.meeting.MeetingResponse;
import com.backoffice.backend.dto.meeting.MeetingUpdateRequest;
import com.backoffice.backend.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @GetMapping
    public List<MeetingResponse> list(@PathVariable UUID customerId) {
        return meetingService.listForCustomer(customerId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MeetingResponse create(@PathVariable UUID customerId, @Valid @RequestBody MeetingCreateRequest request) {
        return meetingService.create(customerId, request);
    }

    @PatchMapping("/{meetingId}")
    public MeetingResponse update(
            @PathVariable UUID customerId,
            @PathVariable UUID meetingId,
            @RequestBody MeetingUpdateRequest request
    ) {
        return meetingService.update(customerId, meetingId, request);
    }
}
