package com.backoffice.backend.web;

import com.backoffice.backend.dto.agreement.AgreementRequest;
import com.backoffice.backend.dto.agreement.AgreementResponse;
import com.backoffice.backend.dto.customer.CustomerResponse;
import com.backoffice.backend.dto.signature.AttachAgreementRequest;
import com.backoffice.backend.dto.signature.CreateSignatureRequestRequest;
import com.backoffice.backend.dto.signature.SignatureRequestCreatedResponse;
import com.backoffice.backend.dto.signature.UnlinkedAgreementResponse;
import com.backoffice.backend.service.CustomerService;
import com.backoffice.backend.service.PaymentService;
import com.backoffice.backend.service.SignatureRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/agreements")
@RequiredArgsConstructor
public class AgreementController {

    private final CustomerService customerService;
    private final PaymentService paymentService;
    private final SignatureRequestService signatureRequestService;

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

    /**
     * Creates a one-time public signing link for a client agreement. The returned token is never
     * persisted in plaintext - only its hash is stored, and the link is invalidated after signing.
     */
    @PostMapping("/signature-requests")
    public SignatureRequestCreatedResponse createSignatureRequest(@Valid @RequestBody CreateSignatureRequestRequest request) {
        return signatureRequestService.create(request);
    }

    /** Signed agreements not yet attached to any customer - e.g. a potential customer who signed before being added to לקוחות. */
    @GetMapping("/unlinked")
    public List<UnlinkedAgreementResponse> listUnlinked() {
        return signatureRequestService.listUnlinked();
    }

    @PostMapping("/unlinked/{id}/attach")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void attach(@PathVariable UUID id, @Valid @RequestBody AttachAgreementRequest request) {
        signatureRequestService.attachToCustomer(id, request.customerId());
    }
}
