package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Payment;
import com.backoffice.backend.domain.entity.PaymentStatus;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.PaymentRepository;
import com.backoffice.backend.dto.payment.PaymentCreateRequest;
import com.backoffice.backend.dto.payment.PaymentResponse;
import com.backoffice.backend.dto.payment.PaymentUpdateRequest;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final TimelineService timelineService;

    public List<PaymentResponse> listForCustomer(UUID customerId) {
        return paymentRepository.findByCustomerIdOrderByDateDesc(customerId).stream()
                .map(PaymentResponse::from)
                .toList();
    }

    @Transactional
    public PaymentResponse create(UUID customerId, PaymentCreateRequest request) {
        Payment payment = new Payment();
        payment.setCustomerId(customerId);
        payment.setAmount(request.amount());
        payment.setDate(request.date());
        payment.setStatus(request.status());
        payment = paymentRepository.save(payment);

        if (request.status() == PaymentStatus.paid) {
            timelineService.record(customerId, TimelineEventType.payment_received, request.date(),
                    request.amount() + " ₪");
        }

        return PaymentResponse.from(payment);
    }

    @Transactional
    public PaymentResponse update(UUID customerId, UUID paymentId, PaymentUpdateRequest request) {
        Payment payment = paymentRepository.findById(paymentId)
                .filter(p -> p.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Payment not found: " + paymentId));

        boolean becamePaid = payment.getStatus() != PaymentStatus.paid && request.status() == PaymentStatus.paid;
        payment.setAmount(request.amount());
        payment.setDate(request.date());
        payment.setStatus(request.status());
        payment = paymentRepository.save(payment);

        if (becamePaid) {
            timelineService.record(customerId, TimelineEventType.payment_received, LocalDate.now(),
                    payment.getAmount() + " ₪");
        }

        return PaymentResponse.from(payment);
    }

    public List<Payment> upcoming() {
        return paymentRepository.findByStatusInOrderByDateAsc(Set.of(PaymentStatus.pending, PaymentStatus.overdue));
    }

    public List<Payment> all(PaymentStatus status) {
        return status == null
                ? paymentRepository.findAllByOrderByDateDesc()
                : paymentRepository.findByStatusOrderByDateDesc(status);
    }

    /** Called when a customer's process ends - open payments are no longer expected, so they're cancelled, not left dangling. */
    @Transactional
    public void cancelOpenPaymentsForCustomer(UUID customerId) {
        List<Payment> open = paymentRepository.findByCustomerIdOrderByDateDesc(customerId).stream()
                .filter(p -> p.getStatus() == PaymentStatus.pending || p.getStatus() == PaymentStatus.overdue)
                .toList();
        open.forEach(p -> p.setStatus(PaymentStatus.cancelled));
        paymentRepository.saveAll(open);
    }
}
