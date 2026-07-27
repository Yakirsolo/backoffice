package com.backoffice.backend.dto.document;

import com.backoffice.backend.domain.entity.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DocumentConfirmRequest(
        @NotBlank String storageKey,
        @NotNull DocumentType type,
        @NotBlank String name,
        @NotNull LocalDate date
) {
}
