package com.backoffice.backend.web;

import com.backoffice.backend.dto.payment.PaymentCreateRequest;
import com.backoffice.backend.dto.payment.PaymentResponse;
import com.backoffice.backend.dto.payment.PaymentUpdateRequest;
import com.backoffice.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public List<PaymentResponse> list(@PathVariable UUID customerId) {
        return paymentService.listForCustomer(customerId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@PathVariable UUID customerId, @Valid @RequestBody PaymentCreateRequest request) {
        return paymentService.create(customerId, request);
    }

    @PatchMapping("/{paymentId}")
    public PaymentResponse update(
            @PathVariable UUID customerId,
            @PathVariable UUID paymentId,
            @Valid @RequestBody PaymentUpdateRequest request
    ) {
        return paymentService.update(customerId, paymentId, request);
    }
}
