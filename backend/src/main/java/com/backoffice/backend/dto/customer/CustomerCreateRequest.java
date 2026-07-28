package com.backoffice.backend.dto.customer;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.LeadSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerCreateRequest(
        @NotBlank String name,
        Integer age,
        String phone,
        String instagram,
        String facebook,
        String description,
        @NotBlank String program,
        @NotNull @Positive BigDecimal price,
        @NotNull @Positive Integer billingIntervalValue,
        @NotNull BillingIntervalUnit billingIntervalUnit,
        @NotNull LocalDate startDate,
        @NotNull LeadSource source,
        @NotNull @Positive BigDecimal startWeight,
        @NotNull @Positive BigDecimal targetWeight,
        BigDecimal waist,
        BigDecimal thigh,
        BigDecimal hip
) {
}
