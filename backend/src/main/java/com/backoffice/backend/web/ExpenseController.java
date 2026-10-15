package com.backoffice.backend.web;

import com.backoffice.backend.dto.expense.ExpenseRequest;
import com.backoffice.backend.dto.expense.ExpenseResponse;
import com.backoffice.backend.dto.storage.UploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.service.ExpenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public List<ExpenseResponse> list() {
        return expenseService.list();
    }

    @PostMapping("/upload-url")
    public UploadUrlResponse createUploadUrl(@Valid @RequestBody UploadUrlRequest request) {
        return expenseService.createUploadUrl(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@Valid @RequestBody ExpenseRequest request) {
        return expenseService.create(request);
    }

    @PatchMapping("/{id}")
    public ExpenseResponse update(@PathVariable UUID id, @Valid @RequestBody ExpenseRequest request) {
        return expenseService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        expenseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
