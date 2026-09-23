package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.LeadSource;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.PaymentRepository;
import com.backoffice.backend.domain.repository.ProgressMeasurementRepository;
import com.backoffice.backend.dto.customer.CustomerCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private ProgressMeasurementRepository measurementRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentService paymentService;
    @Mock private TimelineService timelineService;
    @Mock private MeetingSchedulingService meetingSchedulingService;

    private CustomerService service;

    @BeforeEach
    void setUp() {
        service = new CustomerService(customerRepository, measurementRepository, paymentRepository,
                paymentService, timelineService, meetingSchedulingService);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void creatingACustomer_schedulesTheirFirstMeeting() {
        CustomerCreateRequest request = new CustomerCreateRequest(
                "דנה כהן", 30, "0501234567", null, "חבילת 3 חודשים",
                BigDecimal.valueOf(500), 1, BillingIntervalUnit.month,
                LocalDate.of(2026, 4, 1), LeadSource.instagram,
                BigDecimal.valueOf(80), BigDecimal.valueOf(70), null, null, null
        );

        service.create(request);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(meetingSchedulingService).scheduleFirstMeeting(captor.capture());
        assertThat(captor.getValue().getStartDate()).isEqualTo(LocalDate.of(2026, 4, 1));
    }

    @Test
    void schedulingFailure_doesNotPreventCustomerCreation() {
        doThrow(new RuntimeException("boom")).when(meetingSchedulingService).scheduleFirstMeeting(any());

        CustomerCreateRequest request = new CustomerCreateRequest(
                "דנה כהן", 30, "0501234567", null, "חבילת 3 חודשים",
                BigDecimal.valueOf(500), 1, BillingIntervalUnit.month,
                LocalDate.of(2026, 4, 1), LeadSource.instagram,
                BigDecimal.valueOf(80), BigDecimal.valueOf(70), null, null, null
        );

        var response = service.create(request);

        assertThat(response).isNotNull();
        verify(customerRepository).save(any(Customer.class));
    }
}
