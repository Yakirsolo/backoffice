package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Todo;
import com.backoffice.backend.domain.repository.TodoRepository;
import com.backoffice.backend.dto.todo.TodoCreateRequest;
import com.backoffice.backend.dto.todo.TodoResponse;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TodoService {

    private final TodoRepository todoRepository;

    public List<TodoResponse> list() {
        return todoRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(TodoResponse::from)
                .toList();
    }

    public TodoResponse create(TodoCreateRequest request) {
        Todo todo = new Todo();
        todo.setText(request.text());
        todo = todoRepository.save(todo);
        return TodoResponse.from(todo);
    }

    public void delete(UUID id) {
        if (!todoRepository.existsById(id)) {
            throw new NotFoundException("Todo not found: " + id);
        }
        todoRepository.deleteById(id);
    }
}
