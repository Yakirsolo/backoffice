package com.backoffice.backend.dto.signature;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CompleteSignatureRequest(
        @NotBlank String storageKey,
        @NotBlank String contentType,
        @NotNull @Positive Long sizeBytes
) {
}