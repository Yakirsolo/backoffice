package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.service.MeetingSchedulingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

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
}
