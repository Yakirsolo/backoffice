package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Auto-schedules a customer's recurring meeting. Called on customer creation (first meeting),
 * on meeting completion (next meeting), and by the backfill runner - all three funnel through
 * the same guards, so calling this more than once for a customer who's already covered is a
 * safe no-op.
 *
 * <p>Each entry point runs in its own transaction (REQUIRES_NEW) because CustomerService and
 * MeetingService call it from an afterCommit() callback: Spring leaves the finished transaction's
 * resources bound there, so a plain REQUIRED save would silently join that already-committed
 * transaction and never be committed. Don't call these from inside an open transaction that has
 * uncommitted writes this depends on (e.g. the new customer row) - the new transaction can't see
 * them and would block on the meetings.customer_id foreign key.
 */
@Service
@RequiredArgsConstructor
public class MeetingSchedulingService {

    private static final LocalTime DEFAULT_TIME = LocalTime.of(10, 0);
    private static final int DEFAULT_DURATION_MINUTES = 45;
    private static final String DEFAULT_LABEL = "פגישה";

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void scheduleFirstMeeting(Customer customer) {
        if (customer.getStatus() != CustomerStatus.active) return;
        AppUser admin = getAdmin();
        if (admin == null) return;
        tryScheduleNext(customer, admin, customer.getStartDate(), DEFAULT_TIME,
                DEFAULT_LABEL, DEFAULT_DURATION_MINUTES, admin.getZoomPersonalLink());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void scheduleNextMeeting(Customer customer, Meeting anchorMeeting) {
        if (customer.getStatus() != CustomerStatus.active) return;
        AppUser admin = getAdmin();
        if (admin == null) return;
        tryScheduleNext(customer, admin, anchorMeeting.getDate(), anchorMeeting.getTime(),
                anchorMeeting.getType(), anchorMeeting.getDurationMinutes(), anchorMeeting.getZoomLink());
    }

    private void tryScheduleNext(Customer customer, AppUser admin, LocalDate anchorDate, LocalTime anchorTime,
                                  String label, Integer durationMinutes, String zoomLink) {
        boolean hasFutureMeeting = meetingRepository
                .existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(customer.getId(), LocalDate.now());
        if (hasFutureMeeting) return;

        // Roll forward whole cadence periods until the date is today or later. A single step from a
        // long-past anchor could still land in the past, and a past meeting doesn't satisfy the
        // "has future meeting" guards - so every boot's backfill would create yet another one.
        LocalDate nextDate = anchorDate;
        do {
            nextDate = switch (admin.getMeetingCadenceUnit()) {
                case day -> nextDate.plusDays(admin.getMeetingCadenceValue());
                case week -> nextDate.plusWeeks(admin.getMeetingCadenceValue());
                case month -> nextDate.plusMonths(admin.getMeetingCadenceValue());
            };
        } while (nextDate.isBefore(LocalDate.now()));

        Meeting meeting = new Meeting();
        meeting.setCustomerId(customer.getId());
        meeting.setDate(nextDate);
        meeting.setTime(anchorTime);
        meeting.setType(label);
        meeting.setDurationMinutes(durationMinutes);
        meeting.setZoomLink(zoomLink);
        meeting.setCompleted(false);
        meetingRepository.save(meeting);
    }

    private AppUser getAdmin() {
        return userRepository.findAll().stream().findFirst().orElse(null);
    }
}
