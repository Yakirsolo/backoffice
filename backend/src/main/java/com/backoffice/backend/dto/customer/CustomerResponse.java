package com.backoffice.backend.dto.customer;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.LeadSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CustomerResponse(
        UUID id,
        String name,
        Integer age,
        String description,
        String phone,
        LeadSource source,
        CustomerStatus status,
        String program,
        LocalDate startDate,
        BigDecimal startWeight,
        BigDecimal targetWeight,
        BigDecimal currentWeight,
        String photoStorageKey,
        boolean needsFollowUp,
        int billingIntervalValue,
        BillingIntervalUnit billingIntervalUnit,
        LocalDate nextPaymentDate
) {
    public static CustomerResponse from(Customer c, LocalDate nextPaymentDate) {
        return new CustomerResponse(
                c.getId(), c.getName(), c.getAge(), c.getDescription(), c.getPhone(),
                c.getSource(), c.getStatus(), c.getProgram(),
                c.getStartDate(), c.getStartWeight(), c.getTargetWeight(), c.getCurrentWeight(),
                c.getPhotoStorageKey(), c.isNeedsFollowUp(),
                c.getBillingIntervalValue(), c.getBillingIntervalUnit(), nextPaymentDate
        );
    }
}
