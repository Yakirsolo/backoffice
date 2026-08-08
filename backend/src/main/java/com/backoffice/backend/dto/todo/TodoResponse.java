package com.backoffice.backend.dto.todo;

import com.backoffice.backend.domain.entity.Todo;

import java.time.Instant;
import java.util.UUID;

public record TodoResponse(UUID id, String text, Instant createdAt) {
    public static TodoResponse from(Todo todo) {
        return new TodoResponse(todo.getId(), todo.getText(), todo.getCreatedAt());
    }
}
