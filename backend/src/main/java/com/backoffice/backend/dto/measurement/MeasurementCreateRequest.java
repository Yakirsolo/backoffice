package com.backoffice.backend.dto.measurement;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MeasurementCreateRequest(
        @NotNull LocalDate date,
        @NotNull @Positive BigDecimal weight,
        BigDecimal waist,
        BigDecimal thigh,
        BigDecimal hip
) {
}
