package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.entity.Payment;
import com.backoffice.backend.dto.customer.CustomerResponse;
import com.backoffice.backend.dto.dashboard.DashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MeetingService meetingService;
    private final PaymentService paymentService;
    private final CustomerService customerService;

    public DashboardResponse getDashboard() {
        LocalDate today = LocalDate.now();

        List<Meeting> todaysMeetings = meetingService.onDate(today);
        List<Payment> upcomingPayments = paymentService.upcoming();
        List<Customer> followUp = customerService.needingFollowUp();

        YearMonth thisMonth = YearMonth.from(today);
        int newCustomers = customerService
                .startedBetween(thisMonth.atDay(1), thisMonth.atEndOfMonth())
                .size();

        Map<UUID, String> customerNames = resolveCustomerNames(todaysMeetings, upcomingPayments);

        List<DashboardResponse.TodayMeeting> meetingSummaries = todaysMeetings.stream()
                .map(m -> new DashboardResponse.TodayMeeting(
                        m.getId(), m.getCustomerId(), customerNames.getOrDefault(m.getCustomerId(), ""),
                        m.getTime(), m.getType(), m.getZoomLink()))
                .toList();

        List<DashboardResponse.UpcomingPayment> paymentSummaries = upcomingPayments.stream()
                .map(p -> new DashboardResponse.UpcomingPayment(
                        p.getId(), p.getCustomerId(), customerNames.getOrDefault(p.getCustomerId(), ""),
                        p.getAmount(), p.getDate(), p.getStatus().name()))
                .toList();

        List<CustomerResponse> followUpResponses = followUp.stream()
                .map(customerService::toResponse)
                .toList();

        return new DashboardResponse(meetingSummaries, paymentSummaries, followUpResponses, newCustomers);
    }

    private Map<UUID, String> resolveCustomerNames(List<Meeting> meetings, List<Payment> payments) {
        return java.util.stream.Stream.concat(
                        meetings.stream().map(Meeting::getCustomerId),
                        payments.stream().map(Payment::getCustomerId)
                )
                .distinct()
                .collect(Collectors.toMap(Function.identity(), id -> customerService.getById(id).name()));
    }
}
