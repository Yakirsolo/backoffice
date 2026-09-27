package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.service.MeetingSchedulingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Ensures every active customer has a future meeting scheduled. Runs on every boot; it only
 * ever acts on customers missing a future meeting, so after the first run it's a no-op - no
 * "already ran" flag is needed. One customer's failure is logged and skipped rather than
 * aborting the loop (or, left unguarded, failing application startup entirely).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MeetingBackfillRunner implements ApplicationRunner {

    private final CustomerRepository customerRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingSchedulingService meetingSchedulingService;

    @Override
    public void run(ApplicationArguments args) {
        for (Customer customer : customerRepository.findByStatus(CustomerStatus.active)) {
            try {
                backfillOne(customer);
            } catch (RuntimeException e) {
                log.warn("Failed to backfill a meeting for customer {}", customer.getId(), e);
            }
        }
    }

    private void backfillOne(Customer customer) {
        List<Meeting> history = meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId());
        boolean hasFutureMeeting = history.stream()
                .anyMatch(m -> !m.isCompleted() && !m.getDate().isBefore(LocalDate.now()));
        if (hasFutureMeeting) {
            return;
        }

        if (history.isEmpty()) {
            meetingSchedulingService.scheduleFirstMeeting(customer);
        } else {
            meetingSchedulingService.scheduleNextMeeting(customer, history.get(0));
        }
    }
}
