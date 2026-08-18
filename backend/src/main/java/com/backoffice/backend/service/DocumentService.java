package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.CustomerDocument;
import com.backoffice.backend.domain.entity.DocumentType;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.DocumentRepository;
import com.backoffice.backend.dto.document.DocumentConfirmRequest;
import com.backoffice.backend.dto.document.DocumentResponse;
import com.backoffice.backend.dto.document.DocumentUploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.exception.ApiException;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/jpeg", "image/png", "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain"
    );
    private static final long MAX_SIZE_BYTES = 20L * 1024 * 1024;

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final TimelineService timelineService;

    public List<DocumentResponse> listForCustomer(UUID customerId) {
        return documentRepository.findByCustomerIdOrderByDateDesc(customerId).stream()
                .map(d -> DocumentResponse.from(d, storageService.createDownloadUrl(d.getStorageKey())))
                .toList();
    }

    public UploadUrlResponse createUploadUrl(UUID customerId, DocumentUploadUrlRequest request) {
        validateUpload(request.contentType(), request.sizeBytes());
        String key = storageService.buildKey(customerId, "documents", request.fileName());
        String url = storageService.createUploadUrl(key, request.contentType());
        return new UploadUrlResponse(url, key);
    }

    @Transactional
    public DocumentResponse confirm(UUID customerId, DocumentConfirmRequest request) {
        validateUpload(request.contentType(), request.sizeBytes());

        CustomerDocument document = new CustomerDocument();
        document.setCustomerId(customerId);
        document.setType(request.type());
        document.setName(request.name());
        document.setStorageKey(request.storageKey());
        document.setDate(request.date());
        document.setContentType(request.contentType());
        document.setSizeBytes(request.sizeBytes());
        document = documentRepository.save(document);

        if (request.type() == DocumentType.agreement) {
            timelineService.record(customerId, TimelineEventType.agreement_signed, request.date(), null);
        } else if (request.type() == DocumentType.menu) {
            timelineService.record(customerId, TimelineEventType.menu_uploaded, request.date(), null);
        } else {
            timelineService.record(customerId, TimelineEventType.document_uploaded, request.date(), request.name());
        }

        return DocumentResponse.from(document, storageService.createDownloadUrl(document.getStorageKey()));
    }

    @Transactional
    public void delete(UUID customerId, UUID documentId) {
        CustomerDocument document = documentRepository.findById(documentId)
                .filter(d -> d.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Document not found: " + documentId));

        storageService.deleteObject(document.getStorageKey());
        documentRepository.delete(document);

        timelineService.record(customerId, TimelineEventType.document_deleted, LocalDate.now(), document.getName());
    }

    private void validateUpload(String contentType, long sizeBytes) {
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported file type: " + contentType);
        }
        if (sizeBytes > MAX_SIZE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File exceeds the maximum allowed size (20MB)");
        }
    }
}
