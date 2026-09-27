package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingSchedulingServiceTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private UserRepository userRepository;

    private MeetingSchedulingService service;
    private AppUser admin;

    @BeforeEach
    void setUp() {
        service = new MeetingSchedulingService(meetingRepository, userRepository);
        admin = new AppUser();
        admin.setMeetingCadenceValue(1);
        admin.setMeetingCadenceUnit(BillingIntervalUnit.month);
        admin.setZoomPersonalLink("https://zoom.us/j/123");
    }

    private Customer activeCustomer() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);
        customer.setStartDate(LocalDate.now());
        return customer;
    }

    @Test
    void firstMeeting_isScheduledOneCadenceAfterStartDate() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        Meeting saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(customer.getStartDate().plusMonths(1));
        assertThat(saved.getZoomLink()).isEqualTo("https://zoom.us/j/123");
        assertThat(saved.isCompleted()).isFalse();
        assertThat(saved.getTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(saved.getType()).isEqualTo("פגישה");
        assertThat(saved.getDurationMinutes()).isEqualTo(45);
    }

    @Test
    void firstMeeting_dayCadence_addsDaysToStartDate() {
        admin.setMeetingCadenceUnit(BillingIntervalUnit.day);
        admin.setMeetingCadenceValue(10);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        assertThat(captor.getValue().getDate()).isEqualTo(customer.getStartDate().plusDays(10));
    }

    @Test
    void firstMeeting_weekCadence_addsWeeksToStartDate() {
        admin.setMeetingCadenceUnit(BillingIntervalUnit.week);
        admin.setMeetingCadenceValue(2);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        assertThat(captor.getValue().getDate()).isEqualTo(customer.getStartDate().plusWeeks(2));
    }

    @Test
    void nextMeeting_anchorsOnTheGivenMeetingsOwnDateNotToday() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        Meeting anchor = new Meeting();
        anchor.setCustomerId(customer.getId());
        anchor.setDate(LocalDate.now().plusDays(3));
        anchor.setTime(LocalTime.of(11, 30));
        anchor.setType("מעקב חודשי");
        anchor.setDurationMinutes(60);
        anchor.setZoomLink("https://zoom.us/j/999");

        service.scheduleNextMeeting(customer, anchor);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        Meeting saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(anchor.getDate().plusMonths(1));
        assertThat(saved.getTime()).isEqualTo(LocalTime.of(11, 30));
        assertThat(saved.getType()).isEqualTo("מעקב חודשי");
        assertThat(saved.getDurationMinutes()).isEqualTo(60);
        assertThat(saved.getZoomLink()).isEqualTo("https://zoom.us/j/999");
    }

    @Test
    void doesNotSchedule_whenCustomerIsFinished() {
        Customer customer = activeCustomer();
        customer.setStatus(CustomerStatus.finished);

        service.scheduleFirstMeeting(customer);

        verify(meetingRepository, never()).save(any());
        verifyNoInteractions(userRepository);
    }

    @Test
    void doesNotSchedule_whenCustomerAlreadyHasAFutureIncompleteMeeting() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(true);

        service.scheduleFirstMeeting(customer);

        verify(meetingRepository, never()).save(any());
    }

    @Test
    void longPastAnchor_monthCadence_rollsForwardToTodayOrLater() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        customer.setStartDate(LocalDate.now().minusMonths(6));
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        Meeting saved = captor.getValue();
        assertThat(saved.getDate()).isAfterOrEqualTo(LocalDate.now());
        assertThat(saved.getDate()).isBeforeOrEqualTo(LocalDate.now().plusMonths(1));
    }

    @Test
    void longPastAnchor_dayCadence_rollsForwardKeepingTheCadencePhase() {
        admin.setMeetingCadenceUnit(BillingIntervalUnit.day);
        admin.setMeetingCadenceValue(10);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        Meeting anchor = new Meeting();
        anchor.setCustomerId(customer.getId());
        anchor.setDate(LocalDate.now().minusDays(25));
        anchor.setTime(LocalTime.of(9, 0));

        service.scheduleNextMeeting(customer, anchor);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        // -25 -> -15 -> -5 -> +5: first 10-day step that isn't in the past
        assertThat(captor.getValue().getDate()).isEqualTo(LocalDate.now().plusDays(5));
    }

    @Test
    void longPastAnchor_weekCadence_rollsForwardKeepingTheCadencePhase() {
        admin.setMeetingCadenceUnit(BillingIntervalUnit.week);
        admin.setMeetingCadenceValue(2);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        customer.setStartDate(LocalDate.now().minusWeeks(5));
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        // -5w -> -3w -> -1w -> +1w
        assertThat(captor.getValue().getDate()).isEqualTo(LocalDate.now().plusWeeks(1));
    }

    @Test
    void anchorExactlyOneCadenceBeforeToday_landsOnToday() {
        admin.setMeetingCadenceUnit(BillingIntervalUnit.day);
        admin.setMeetingCadenceValue(7);
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        customer.setStartDate(LocalDate.now().minusDays(7));
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        assertThat(captor.getValue().getDate()).isEqualTo(LocalDate.now());
    }
}
