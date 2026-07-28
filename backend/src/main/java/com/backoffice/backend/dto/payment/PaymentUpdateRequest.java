package com.backoffice.backend.dto.payment;

import com.backoffice.backend.domain.entity.PaymentStatus;
import jakarta.validation.constraints.NotNull;

public record PaymentUpdateRequest(@NotNull PaymentStatus status) {
}
