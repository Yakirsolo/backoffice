package com.backoffice.backend.dto.signature;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateSignatureRequestRequest(
        UUID customerId,
        @NotBlank String customerName,
        @NotBlank String customerIdNumber,
        @NotBlank String customerAddress,
        @NotBlank String program,
        Integer durationMonths,
        BigDecimal price,
        String paymentTerms,
        @NotNull LocalDate agreementDate
) {
}