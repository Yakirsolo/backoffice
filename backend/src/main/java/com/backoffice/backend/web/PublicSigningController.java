package com.backoffice.backend.web;

import com.backoffice.backend.dto.signature.CompleteSignatureRequest;
import com.backoffice.backend.dto.signature.SignatureRequestPublicResponse;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.service.SignatureRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public/sign")
@RequiredArgsConstructor
public class PublicSigningController {

    private final SignatureRequestService signatureRequestService;

    @GetMapping("/{token}")
    public SignatureRequestPublicResponse view(@PathVariable String token) {
        return signatureRequestService.getPublicView(token);
    }

    @PostMapping("/{token}/upload-url")
    public UploadUrlResponse createUploadUrl(@PathVariable String token) {
        return signatureRequestService.createUploadUrl(token);
    }

    @PostMapping("/{token}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@PathVariable String token, @Valid @RequestBody CompleteSignatureRequest request) {
        signatureRequestService.complete(token, request);
    }
}
