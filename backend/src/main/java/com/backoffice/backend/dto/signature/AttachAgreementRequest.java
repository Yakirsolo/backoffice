package com.backoffice.backend.dto.signature;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AttachAgreementRequest(@NotNull UUID customerId) {
}
