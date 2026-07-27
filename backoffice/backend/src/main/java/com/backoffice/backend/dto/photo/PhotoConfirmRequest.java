package com.backoffice.backend.dto.photo;

import com.backoffice.backend.domain.entity.PhotoType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record PhotoConfirmRequest(
        @NotBlank String storageKey,
        @NotNull PhotoType type,
        @NotNull LocalDate date,
        UUID measurementId
) {
}
