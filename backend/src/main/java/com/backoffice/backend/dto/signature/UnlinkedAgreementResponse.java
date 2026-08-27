package com.backoffice.backend.dto.signature;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UnlinkedAgreementResponse(
        UUID id,
        String customerName,
        String program,
        Integer durationMonths,
        BigDecimal price,
        LocalDate agreementDate,
        Instant signedAt,
        String downloadUrl
) {
}
