package com.backoffice.backend.dto.agreement;

import java.util.UUID;

/** customerId is optional - when present the response is prefilled from that customer's data. */
public record AgreementRequest(UUID customerId) {
}
