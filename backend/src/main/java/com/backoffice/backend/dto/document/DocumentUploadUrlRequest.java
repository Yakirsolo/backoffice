package com.backoffice.backend.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DocumentUploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String contentType,
        @NotNull @Positive Long sizeBytes
) {
}
