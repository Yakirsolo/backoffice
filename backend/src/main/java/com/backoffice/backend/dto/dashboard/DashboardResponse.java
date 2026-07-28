package com.backoffice.backend.dto.dashboard;

import com.backoffice.backend.dto.customer.CustomerResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(
        List<TodayMeeting> todaysMeetings,
        List<UpcomingPayment> upcomingPayments,
        List<CustomerResponse> followUpCustomers,
        int newCustomersThisMonth
) {
    public record TodayMeeting(
            UUID id, UUID customerId, String customerName,
            LocalTime time, String type, String zoomLink
    ) {
    }

    public record UpcomingPayment(
            UUID id, UUID customerId, String customerName,
            BigDecimal amount, LocalDate date, String status
    ) {
    }
}
