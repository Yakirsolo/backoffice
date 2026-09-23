package com.backoffice.backend.service;

import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.dto.meeting.MeetingUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingServiceTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private TimelineService timelineService;

    private MeetingService service;
    private UUID customerId;
    private UUID meetingId;
    private Meeting meeting;

    @BeforeEach
    void setUp() {
        service = new MeetingService(meetingRepository, timelineService);
        customerId = UUID.randomUUID();
        meetingId = UUID.randomUUID();

        meeting = new Meeting();
        meeting.setId(meetingId);
        meeting.setCustomerId(customerId);
        meeting.setDate(LocalDate.of(2026, 5, 1));
        meeting.setTime(LocalTime.of(9, 0));
        meeting.setType("פגישה");
        meeting.setCompleted(false);

        when(meetingRepository.findById(meetingId)).thenReturn(Optional.of(meeting));
    }

    @Test
    void reschedule_updatesDateTimeAndDuration() {
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));
        var request = new MeetingUpdateRequest(LocalDate.of(2026, 6, 10), LocalTime.of(14, 30), 30, null, null, null, null);

        var response = service.update(customerId, meetingId, request);

        assertThat(response.date()).isEqualTo(LocalDate.of(2026, 6, 10));
        assertThat(response.time()).isEqualTo(LocalTime.of(14, 30));
        assertThat(response.durationMinutes()).isEqualTo(30);
    }

    @Test
    void reschedule_updatesTheDescription() {
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));
        var request = new MeetingUpdateRequest(null, null, null, "שיחת מעקב מעודכנת", null, null, null);

        var response = service.update(customerId, meetingId, request);

        assertThat(response.type()).isEqualTo("שיחת מעקב מעודכנת");
    }

    @Test
    void delete_removesTheMeeting() {
        service.delete(customerId, meetingId);

        verify(meetingRepository).delete(meeting);
    }
}
