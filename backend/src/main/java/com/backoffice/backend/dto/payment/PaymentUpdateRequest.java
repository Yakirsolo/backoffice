package com.backoffice.backend.dto.payment;

import com.backoffice.backend.domain.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentUpdateRequest(
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate date,
        @NotNull PaymentStatus status
) {
}
