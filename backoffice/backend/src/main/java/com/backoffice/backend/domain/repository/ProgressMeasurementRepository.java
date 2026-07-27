package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.ProgressMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProgressMeasurementRepository extends JpaRepository<ProgressMeasurement, UUID> {
    List<ProgressMeasurement> findByCustomerIdOrderByDateAsc(UUID customerId);
}
