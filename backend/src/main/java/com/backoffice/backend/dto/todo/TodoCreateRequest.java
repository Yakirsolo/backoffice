package com.backoffice.backend.dto.todo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TodoCreateRequest(@NotBlank @Size(max = 500) String text) {
}
