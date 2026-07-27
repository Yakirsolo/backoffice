package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.CustomerDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<CustomerDocument, UUID> {
    List<CustomerDocument> findByCustomerIdOrderByDateDesc(UUID customerId);
}
