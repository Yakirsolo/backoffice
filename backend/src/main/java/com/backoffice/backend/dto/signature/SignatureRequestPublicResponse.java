package com.backoffice.backend.dto.signature;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SignatureRequestPublicResponse(
        String customerName,
        String customerIdNumber,
        String customerAddress,
        String program,
        Integer durationMonths,
        BigDecimal price,
        String paymentTerms,
        LocalDate agreementDate
) {
}