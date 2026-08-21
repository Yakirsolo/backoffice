package com.backoffice.backend.dto.customer;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.LeadSource;

import java.math.BigDecimal;
import java.time.LocalDate;

/** All fields optional - only non-null fields are applied (partial update / PATCH semantics). */
public record CustomerUpdateRequest(
        String name,
        Integer age,
        String description,
        String phone,
        LeadSource source,
        CustomerStatus status,
        String program,
        LocalDate startDate,
        BigDecimal targetWeight,
        BigDecimal currentWeight,
        Boolean needsFollowUp,
        Integer billingIntervalValue,
        BillingIntervalUnit billingIntervalUnit
) {
}
