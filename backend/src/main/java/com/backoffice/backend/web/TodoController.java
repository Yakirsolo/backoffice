package com.backoffice.backend.web;

import com.backoffice.backend.dto.todo.TodoCreateRequest;
import com.backoffice.backend.dto.todo.TodoResponse;
import com.backoffice.backend.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public List<TodoResponse> list() {
        return todoService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TodoResponse create(@Valid @RequestBody TodoCreateRequest request) {
        return todoService.create(request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        todoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
