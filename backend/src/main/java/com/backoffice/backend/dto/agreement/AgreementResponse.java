package com.backoffice.backend.dto.agreement;

import java.math.BigDecimal;

public record AgreementResponse(
        String customerName,
        String program,
        BigDecimal price
) {
}
