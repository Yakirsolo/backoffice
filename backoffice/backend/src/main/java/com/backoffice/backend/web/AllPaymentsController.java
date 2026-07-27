package com.backoffice.backend.web;

import com.backoffice.backend.domain.entity.PaymentStatus;
import com.backoffice.backend.dto.payment.PaymentResponse;
import com.backoffice.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class AllPaymentsController {

    private final PaymentService paymentService;

    @GetMapping
    public List<PaymentResponse> all(@RequestParam(required = false) PaymentStatus status) {
        return paymentService.all(status).stream().map(PaymentResponse::from).toList();
    }
}
