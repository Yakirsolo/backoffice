package com.backoffice.backend.service;

import com.backoffice.backend.config.StorageProperties;
import com.backoffice.backend.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.time.Duration;
import java.util.UUID;

/**
 * Presigned-URL access to an S3-compatible bucket (Cloudflare R2). The Spring Boot app never
 * proxies file bytes - the browser uploads/downloads directly against these URLs.
 */
@Service
@RequiredArgsConstructor
public class StorageService {

    private final StorageProperties properties;

    public String buildKey(UUID customerId, String category, String fileName) {
        String safeName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return "customers/%s/%s/%s-%s".formatted(customerId, category, UUID.randomUUID(), safeName);
    }

    public String createUploadUrl(String key, String contentType) {
        try (S3Presigner presigner = buildPresigner()) {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .contentType(contentType)
                    .build();
            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(properties.presignMinutes()))
                    .putObjectRequest(putRequest)
                    .build();
            return presigner.presignPutObject(presignRequest).url().toString();
        }
    }

    public String createDownloadUrl(String key) {
        try (S3Presigner presigner = buildPresigner()) {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(properties.bucket())
                    .key(key)
                    .build();
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(properties.presignMinutes()))
                    .getObjectRequest(getRequest)
                    .build();
            return presigner.presignGetObject(presignRequest).url().toString();
        }
    }

    private S3Presigner buildPresigner() {
        if (!properties.isConfigured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "File storage is not configured yet (missing R2 endpoint/bucket/credentials)");
        }
        return S3Presigner.builder()
                .region(Region.of("auto"))
                .endpointOverride(URI.create(properties.endpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.accessKey(), properties.secretKey())))
                .build();
    }
}
