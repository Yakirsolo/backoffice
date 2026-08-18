package com.backoffice.backend.web;

import com.backoffice.backend.dto.photo.PhotoConfirmRequest;
import com.backoffice.backend.dto.photo.PhotoResponse;
import com.backoffice.backend.dto.storage.UploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.service.PhotoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoService photoService;

    @GetMapping
    public List<PhotoResponse> list(@PathVariable UUID customerId) {
        return photoService.listForCustomer(customerId);
    }

    @PostMapping("/upload-url")
    public UploadUrlResponse createUploadUrl(@PathVariable UUID customerId, @Valid @RequestBody UploadUrlRequest request) {
        return photoService.createUploadUrl(customerId, request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoResponse confirm(@PathVariable UUID customerId, @Valid @RequestBody PhotoConfirmRequest request) {
        return photoService.confirm(customerId, request);
    }

    @DeleteMapping("/{photoId}")
    public ResponseEntity<Void> delete(@PathVariable UUID customerId, @PathVariable UUID photoId) {
        photoService.delete(customerId, photoId);
        return ResponseEntity.noContent().build();
    }
}
