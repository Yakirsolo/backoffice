package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.dto.meeting.MeetingCreateRequest;
import com.backoffice.backend.dto.meeting.MeetingResponse;
import com.backoffice.backend.dto.meeting.MeetingUpdateRequest;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final TimelineService timelineService;

    public List<MeetingResponse> listForCustomer(UUID customerId) {
        return meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customerId).stream()
                .map(MeetingResponse::from)
                .toList();
    }

    @Transactional
    public MeetingResponse create(UUID customerId, MeetingCreateRequest request) {
        Meeting meeting = new Meeting();
        meeting.setCustomerId(customerId);
        meeting.setDate(request.date());
        meeting.setTime(request.time());
        meeting.setType(request.type());
        meeting.setDurationMinutes(request.durationMinutes());
        meeting.setZoomLink(request.zoomLink());
        meeting.setReminderEnabled(request.reminderEnabled() == null || request.reminderEnabled());
        meeting.setCompleted(false);
        meeting = meetingRepository.save(meeting);
        return MeetingResponse.from(meeting);
    }

    @Transactional
    public MeetingResponse update(UUID customerId, UUID meetingId, MeetingUpdateRequest request) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .filter(m -> m.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Meeting not found: " + meetingId));

        boolean justCompleted = request.completed() != null && request.completed() && !meeting.isCompleted();

        if (request.completed() != null) meeting.setCompleted(request.completed());
        if (request.notes() != null) meeting.setNotes(request.notes());
        if (request.zoomLink() != null) meeting.setZoomLink(request.zoomLink());
        meeting = meetingRepository.save(meeting);

        if (justCompleted) {
            timelineService.record(customerId, TimelineEventType.meeting_completed, LocalDate.now(), meeting.getType());
        }

        return MeetingResponse.from(meeting);
    }

    public List<Meeting> onDate(LocalDate date) {
        return meetingRepository.findByDateAndCompletedFalseOrderByTime(date);
    }

    public List<Meeting> all() {
        return meetingRepository.findAllByOrderByDateAscTimeAsc();
    }
}
