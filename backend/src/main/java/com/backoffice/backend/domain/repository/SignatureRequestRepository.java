package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.SignatureRequest;
import com.backoffice.backend.domain.entity.SignatureRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SignatureRequestRepository extends JpaRepository<SignatureRequest, UUID> {
    Optional<SignatureRequest> findByTokenHash(String tokenHash);

    List<SignatureRequest> findByStatusAndCustomerIdIsNullOrderBySignedAtDesc(SignatureRequestStatus status);
}