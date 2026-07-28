package com.backoffice.backend.web;

import com.backoffice.backend.dto.meeting.MeetingResponse;
import com.backoffice.backend.service.MeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class AllMeetingsController {

    private final MeetingService meetingService;

    @GetMapping
    public List<MeetingResponse> all() {
        return meetingService.all().stream().map(MeetingResponse::from).toList();
    }
}
