package com.backoffice.backend.web;

import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.dto.customer.CustomerCreateRequest;
import com.backoffice.backend.dto.customer.CustomerResponse;
import com.backoffice.backend.dto.customer.CustomerUpdateRequest;
import com.backoffice.backend.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public List<CustomerResponse> search(
            @RequestParam(required = false) CustomerStatus status,
            @RequestParam(required = false) String search
    ) {
        return customerService.search(status, search);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(@Valid @RequestBody CustomerCreateRequest request) {
        return customerService.create(request);
    }

    @GetMapping("/{id}")
    public CustomerResponse getById(@PathVariable UUID id) {
        return customerService.getById(id);
    }

    @PatchMapping("/{id}")
    public CustomerResponse update(@PathVariable UUID id, @RequestBody CustomerUpdateRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        customerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
