package com.backoffice.backend.web;

import com.backoffice.backend.dto.document.DocumentConfirmRequest;
import com.backoffice.backend.dto.document.DocumentResponse;
import com.backoffice.backend.dto.document.DocumentUploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    public List<DocumentResponse> list(@PathVariable UUID customerId) {
        return documentService.listForCustomer(customerId);
    }

    @PostMapping("/upload-url")
    public UploadUrlResponse createUploadUrl(@PathVariable UUID customerId, @Valid @RequestBody DocumentUploadUrlRequest request) {
        return documentService.createUploadUrl(customerId, request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse confirm(@PathVariable UUID customerId, @Valid @RequestBody DocumentConfirmRequest request) {
        return documentService.confirm(customerId, request);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID customerId, @PathVariable UUID documentId) {
        documentService.delete(customerId, documentId);
        return ResponseEntity.noContent().build();
    }
}
