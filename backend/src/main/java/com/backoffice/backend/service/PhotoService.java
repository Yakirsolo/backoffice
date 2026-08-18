package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Photo;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.PhotoRepository;
import com.backoffice.backend.dto.photo.PhotoConfirmRequest;
import com.backoffice.backend.dto.photo.PhotoResponse;
import com.backoffice.backend.dto.storage.UploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final StorageService storageService;
    private final TimelineService timelineService;

    public List<PhotoResponse> listForCustomer(UUID customerId) {
        return photoRepository.findByCustomerIdOrderByDateDesc(customerId).stream()
                .map(p -> PhotoResponse.from(p, storageService.createDownloadUrl(p.getStorageKey())))
                .toList();
    }

    public UploadUrlResponse createUploadUrl(UUID customerId, UploadUrlRequest request) {
        String key = storageService.buildKey(customerId, "photos", request.fileName());
        String url = storageService.createUploadUrl(key, request.contentType());
        return new UploadUrlResponse(url, key);
    }

    @Transactional
    public PhotoResponse confirm(UUID customerId, PhotoConfirmRequest request) {
        Photo photo = new Photo();
        photo.setCustomerId(customerId);
        photo.setMeasurementId(request.measurementId());
        photo.setType(request.type());
        photo.setStorageKey(request.storageKey());
        photo.setDate(request.date());
        photo = photoRepository.save(photo);

        timelineService.record(customerId, TimelineEventType.photo_upload, request.date(), null);

        return PhotoResponse.from(photo, storageService.createDownloadUrl(photo.getStorageKey()));
    }

    @Transactional
    public void delete(UUID customerId, UUID photoId) {
        Photo photo = photoRepository.findById(photoId)
                .filter(p -> p.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Photo not found: " + photoId));

        storageService.deleteObject(photo.getStorageKey());
        photoRepository.delete(photo);

        timelineService.record(customerId, TimelineEventType.photo_deleted, LocalDate.now(), null);
    }
}
