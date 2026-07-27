package com.backoffice.backend.web;

import com.backoffice.backend.dto.agreement.AgreementRequest;
import com.backoffice.backend.dto.agreement.AgreementResponse;
import com.backoffice.backend.dto.customer.CustomerResponse;
import com.backoffice.backend.service.CustomerService;
import com.backoffice.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/agreements")
@RequiredArgsConstructor
public class AgreementController {

    private final CustomerService customerService;
    private final PaymentService paymentService;

    /**
     * Prefills agreement fields from an existing customer. The frontend still renders/prints the
     * agreement client-side for now; server-side PDF generation is a later upgrade (see plan).
     */
    @PostMapping("/generate")
    public AgreementResponse generate(@RequestBody AgreementRequest request) {
        if (request.customerId() == null) {
            return new AgreementResponse("", "", null);
        }
        CustomerResponse customer = customerService.getById(request.customerId());
        BigDecimal lastAmount = paymentService.listForCustomer(request.customerId()).stream()
                .findFirst()
                .map(p -> p.amount())
                .orElse(null);
        return new AgreementResponse(customer.name(), customer.program(), lastAmount);
    }
}
