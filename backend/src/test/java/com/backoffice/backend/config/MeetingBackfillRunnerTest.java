package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.repository.UserRepository;
import com.backoffice.backend.service.MeetingSchedulingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingBackfillRunnerTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private MeetingRepository meetingRepository;
    @Mock private MeetingSchedulingService meetingSchedulingService;

    private MeetingBackfillRunner runner;

    @BeforeEach
    void setUp() {
        runner = new MeetingBackfillRunner(customerRepository, meetingRepository, meetingSchedulingService);
    }

    @Test
    void customerWithNoMeetingsAtAll_getsAFirstMeetingScheduled() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);
        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of());

        runner.run(null);

        verify(meetingSchedulingService).scheduleFirstMeeting(customer);
    }

    @Test
    void customerWithOnlyPastMeetings_getsNextMeetingScheduledFromTheMostRecent() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);

        Meeting pastMeeting = new Meeting();
        pastMeeting.setCustomerId(customer.getId());
        pastMeeting.setDate(LocalDate.now().minusMonths(1));
        pastMeeting.setCompleted(true);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of(pastMeeting));

        runner.run(null);

        verify(meetingSchedulingService).scheduleNextMeeting(customer, pastMeeting);
    }

    @Test
    void customerWithAFutureIncompleteMeeting_isSkipped() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);

        Meeting futureMeeting = new Meeting();
        futureMeeting.setCustomerId(customer.getId());
        futureMeeting.setDate(LocalDate.now().plusDays(5));
        futureMeeting.setCompleted(false);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of(futureMeeting));

        runner.run(null);

        verifyNoInteractions(meetingSchedulingService);
    }

    @Test
    void oneCustomersSchedulingFailure_doesNotStopTheOthersFromBeingBackfilled() throws Exception {
        Customer failing = new Customer();
        failing.setId(UUID.randomUUID());
        failing.setStatus(CustomerStatus.active);
        Customer healthy = new Customer();
        healthy.setId(UUID.randomUUID());
        healthy.setStatus(CustomerStatus.active);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(failing, healthy));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(failing.getId())).thenReturn(List.of());
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(healthy.getId())).thenReturn(List.of());
        org.mockito.Mockito.doThrow(new RuntimeException("boom"))
                .when(meetingSchedulingService).scheduleFirstMeeting(failing);

        runner.run(null);

        verify(meetingSchedulingService).scheduleFirstMeeting(healthy);
    }

    /**
     * Regression test for "safe to run on every boot": uses the real MeetingSchedulingService over an
     * in-memory meeting list, with a customer whose last meeting is long past. The first boot must
     * create exactly one meeting, and it must be dated today-or-later so the second boot sees it as
     * covering the customer and creates nothing.
     */
    @Test
    void runningTwice_withALongPastLastMeeting_createsExactlyOneFutureMeeting() throws Exception {
        UserRepository userRepository = org.mockito.Mockito.mock(UserRepository.class);
        AppUser admin = new AppUser();
        admin.setMeetingCadenceValue(1);
        admin.setMeetingCadenceUnit(BillingIntervalUnit.month);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        MeetingSchedulingService realScheduling = new MeetingSchedulingService(meetingRepository, userRepository);
        MeetingBackfillRunner realRunner = new MeetingBackfillRunner(customerRepository, meetingRepository, realScheduling);

        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);

        Meeting oldMeeting = new Meeting();
        oldMeeting.setCustomerId(customer.getId());
        oldMeeting.setDate(LocalDate.now().minusMonths(6));
        oldMeeting.setTime(LocalTime.of(10, 0));
        oldMeeting.setCompleted(true);

        List<Meeting> stored = new ArrayList<>(List.of(oldMeeting));
        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId()))
                .thenAnswer(inv -> stored.stream()
                        .sorted(Comparator.comparing(Meeting::getDate).reversed())
                        .toList());
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenAnswer(inv -> {
                    LocalDate from = inv.getArgument(1);
                    return stored.stream().anyMatch(m -> !m.isCompleted() && !m.getDate().isBefore(from));
                });
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> {
            Meeting m = inv.getArgument(0);
            stored.add(m);
            return m;
        });

        realRunner.run(null);
        realRunner.run(null);

        assertThat(stored).hasSize(2);
        Meeting created = stored.get(1);
        assertThat(created.getDate()).isAfterOrEqualTo(LocalDate.now());
        verify(meetingRepository, org.mockito.Mockito.times(1)).save(any(Meeting.class));
    }
}
