package com.backoffice.backend.dto.payment;

import com.backoffice.backend.domain.entity.Payment;
import com.backoffice.backend.domain.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID customerId,
        BigDecimal amount,
        LocalDate date,
        PaymentStatus status
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(p.getId(), p.getCustomerId(), p.getAmount(), p.getDate(), p.getStatus());
    }
}
