package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.CustomerDocument;
import com.backoffice.backend.domain.entity.DocumentType;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.DocumentRepository;
import com.backoffice.backend.dto.document.DocumentConfirmRequest;
import com.backoffice.backend.dto.document.DocumentResponse;
import com.backoffice.backend.dto.storage.UploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final TimelineService timelineService;

    public List<DocumentResponse> listForCustomer(UUID customerId) {
        return documentRepository.findByCustomerIdOrderByDateDesc(customerId).stream()
                .map(d -> DocumentResponse.from(d, storageService.createDownloadUrl(d.getStorageKey())))
                .toList();
    }

    public UploadUrlResponse createUploadUrl(UUID customerId, UploadUrlRequest request) {
        String key = storageService.buildKey(customerId, "documents", request.fileName());
        String url = storageService.createUploadUrl(key, request.contentType());
        return new UploadUrlResponse(url, key);
    }

    @Transactional
    public DocumentResponse confirm(UUID customerId, DocumentConfirmRequest request) {
        CustomerDocument document = new CustomerDocument();
        document.setCustomerId(customerId);
        document.setType(request.type());
        document.setName(request.name());
        document.setStorageKey(request.storageKey());
        document.setDate(request.date());
        document = documentRepository.save(document);

        if (request.type() == DocumentType.agreement) {
            timelineService.record(customerId, TimelineEventType.agreement_signed, request.date(), null);
        } else if (request.type() == DocumentType.menu) {
            timelineService.record(customerId, TimelineEventType.menu_uploaded, request.date(), null);
        }

        return DocumentResponse.from(document, storageService.createDownloadUrl(document.getStorageKey()));
    }
}
