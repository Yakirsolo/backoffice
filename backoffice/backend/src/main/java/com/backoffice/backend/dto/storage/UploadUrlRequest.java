package com.backoffice.backend.dto.storage;

import jakarta.validation.constraints.NotBlank;

public record UploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String contentType
) {
}
