package com.backoffice.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "signature_requests")
@Getter
@Setter
@NoArgsConstructor
public class SignatureRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SignatureRequestStatus status = SignatureRequestStatus.pending;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_id_number", nullable = false)
    private String customerIdNumber;

    @Column(name = "customer_address", nullable = false)
    private String customerAddress;

    @Column(nullable = false)
    private String program;

    @Column(name = "duration_months")
    private Integer durationMonths;

    @Column
    private BigDecimal price;

    @Column(name = "payment_terms")
    private String paymentTerms;

    @Column(name = "agreement_date", nullable = false)
    private LocalDate agreementDate;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "storage_key")
    private String storageKey;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}