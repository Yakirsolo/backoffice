package com.backoffice.backend.dto.photo;

import com.backoffice.backend.domain.entity.Photo;
import com.backoffice.backend.domain.entity.PhotoType;

import java.time.LocalDate;
import java.util.UUID;

public record PhotoResponse(
        UUID id,
        UUID customerId,
        UUID measurementId,
        PhotoType type,
        LocalDate date,
        String viewUrl
) {
    public static PhotoResponse from(Photo p, String viewUrl) {
        return new PhotoResponse(p.getId(), p.getCustomerId(), p.getMeasurementId(), p.getType(), p.getDate(), viewUrl);
    }
}
