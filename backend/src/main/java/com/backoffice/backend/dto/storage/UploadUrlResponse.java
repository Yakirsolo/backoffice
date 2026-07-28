package com.backoffice.backend.dto.storage;

public record UploadUrlResponse(
        String uploadUrl,
        String storageKey
) {
}
