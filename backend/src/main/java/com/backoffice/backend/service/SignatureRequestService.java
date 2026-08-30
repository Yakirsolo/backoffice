package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.DocumentType;
import com.backoffice.backend.domain.entity.SignatureRequest;
import com.backoffice.backend.domain.entity.SignatureRequestStatus;
import com.backoffice.backend.domain.repository.SignatureRequestRepository;
import com.backoffice.backend.dto.document.DocumentConfirmRequest;
import com.backoffice.backend.dto.document.DocumentResponse;
import com.backoffice.backend.dto.signature.CreateSignatureRequestRequest;
import com.backoffice.backend.dto.signature.SignatureRequestCreatedResponse;
import com.backoffice.backend.dto.signature.SignatureRequestPublicResponse;
import com.backoffice.backend.dto.signature.UnlinkedAgreementResponse;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.exception.ApiException;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SignatureRequestService {

    private static final String SIGNED_PDF_CONTENT_TYPE = "application/pdf";
    private static final String SIGNED_PDF_FILE_NAME = "signed-agreement.pdf";

    private final SignatureRequestRepository signatureRequestRepository;
    private final StorageService storageService;
    private final DocumentService documentService;

    @Transactional
    public SignatureRequestCreatedResponse create(CreateSignatureRequestRequest request) {
        String token = generateToken();

        SignatureRequest signatureRequest = new SignatureRequest();
        signatureRequest.setCustomerId(request.customerId());
        signatureRequest.setTokenHash(hash(token));
        signatureRequest.setCustomerName(request.customerName());
        signatureRequest.setCustomerIdNumber(request.customerIdNumber());
        signatureRequest.setCustomerAddress(request.customerAddress());
        signatureRequest.setProgram(request.program());
        signatureRequest.setDurationMonths(request.durationMonths());
        signatureRequest.setPrice(request.price());
        signatureRequest.setPaymentTerms(request.paymentTerms());
        signatureRequest.setAgreementDate(request.agreementDate());
        signatureRequestRepository.save(signatureRequest);

        return new SignatureRequestCreatedResponse(token);
    }

    public SignatureRequestPublicResponse getPublicView(String token) {
        SignatureRequest signatureRequest = requirePending(token);
        return new SignatureRequestPublicResponse(
                signatureRequest.getCustomerName(),
                signatureRequest.getCustomerIdNumber(),
                signatureRequest.getCustomerAddress(),
                signatureRequest.getProgram(),
                signatureRequest.getDurationMonths(),
                signatureRequest.getPrice(),
                signatureRequest.getPaymentTerms(),
                signatureRequest.getAgreementDate()
        );
    }

    @Transactional
    public UploadUrlResponse createUploadUrl(String token) {
        SignatureRequest signatureRequest = requirePending(token);
        String key = signatureRequest.getCustomerId() != null
                ? storageService.buildKey(signatureRequest.getCustomerId(), "agreements", SIGNED_PDF_FILE_NAME)
                : "leads/%s/agreements/%s-%s".formatted(signatureRequest.getId(), UUID.randomUUID(), SIGNED_PDF_FILE_NAME);
        String url = storageService.createUploadUrl(key, SIGNED_PDF_CONTENT_TYPE);

        // Persisted immediately so `complete()` never has to trust a client-supplied key/type/size.
        signatureRequest.setStorageKey(key);
        signatureRequestRepository.save(signatureRequest);

        return new UploadUrlResponse(url, key);
    }

    @Transactional
    public void complete(String token) {
        SignatureRequest signatureRequest = requirePending(token);
        if (signatureRequest.getStorageKey() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload was not initiated for this signing link");
        }

        // Confirms the PDF actually landed at the server-issued key and reads its real size - never trust the client for either.
        long sizeBytes = storageService.getObjectSize(signatureRequest.getStorageKey());

        if (signatureRequest.getCustomerId() != null) {
            DocumentConfirmRequest documentConfirmRequest = new DocumentConfirmRequest(
                    signatureRequest.getStorageKey(),
                    DocumentType.agreement,
                    "הסכם חתום",
                    LocalDate.now(),
                    SIGNED_PDF_CONTENT_TYPE,
                    sizeBytes
            );
            DocumentResponse document = documentService.confirm(signatureRequest.getCustomerId(), documentConfirmRequest);
            signatureRequest.setDocumentId(document.id());
        }

        signatureRequest.setContentType(SIGNED_PDF_CONTENT_TYPE);
        signatureRequest.setSizeBytes(sizeBytes);
        signatureRequest.setStatus(SignatureRequestStatus.signed);
        signatureRequest.setSignedAt(Instant.now());
    }

    public List<UnlinkedAgreementResponse> listUnlinked() {
        return signatureRequestRepository.findByStatusAndCustomerIdIsNullOrderBySignedAtDesc(SignatureRequestStatus.signed).stream()
                .map(sr -> new UnlinkedAgreementResponse(
                        sr.getId(),
                        sr.getCustomerName(),
                        sr.getProgram(),
                        sr.getDurationMonths(),
                        sr.getPrice(),
                        sr.getAgreementDate(),
                        sr.getSignedAt(),
                        tryCreateDownloadUrl(sr.getStorageKey())
                ))
                .toList();
    }

    /** Storage may be unconfigured (e.g. local dev) - the list itself should still render without a working download link. */
    private String tryCreateDownloadUrl(String storageKey) {
        try {
            return storageService.createDownloadUrl(storageKey);
        } catch (ApiException e) {
            return null;
        }
    }

    @Transactional
    public void attachToCustomer(UUID signatureRequestId, UUID customerId) {
        SignatureRequest signatureRequest = signatureRequestRepository.findById(signatureRequestId)
                .orElseThrow(() -> new NotFoundException("Agreement not found: " + signatureRequestId));
        if (signatureRequest.getStatus() != SignatureRequestStatus.signed || signatureRequest.getCustomerId() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "This agreement is not available to attach");
        }

        DocumentConfirmRequest documentConfirmRequest = new DocumentConfirmRequest(
                signatureRequest.getStorageKey(),
                DocumentType.agreement,
                "הסכם חתום",
                signatureRequest.getAgreementDate(),
                signatureRequest.getContentType(),
                signatureRequest.getSizeBytes()
        );
        DocumentResponse document = documentService.confirm(customerId, documentConfirmRequest);

        signatureRequest.setCustomerId(customerId);
        signatureRequest.setDocumentId(document.id());
    }

    private SignatureRequest requirePending(String token) {
        SignatureRequest signatureRequest = signatureRequestRepository.findByTokenHash(hash(token))
                .orElseThrow(() -> new NotFoundException("Signing link not found"));
        if (signatureRequest.getStatus() != SignatureRequestStatus.pending) {
            throw new ApiException(HttpStatus.GONE, "This signing link has already been used");
        }
        return signatureRequest;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}