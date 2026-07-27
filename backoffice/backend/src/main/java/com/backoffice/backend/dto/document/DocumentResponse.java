package com.backoffice.backend.dto.document;

import com.backoffice.backend.domain.entity.CustomerDocument;
import com.backoffice.backend.domain.entity.DocumentType;

import java.time.LocalDate;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID customerId,
        DocumentType type,
        String name,
        LocalDate date,
        String downloadUrl
) {
    public static DocumentResponse from(CustomerDocument d, String downloadUrl) {
        return new DocumentResponse(d.getId(), d.getCustomerId(), d.getType(), d.getName(), d.getDate(), downloadUrl);
    }
}
