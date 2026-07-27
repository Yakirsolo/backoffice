package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.TimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimelineEventRepository extends JpaRepository<TimelineEvent, UUID> {
    List<TimelineEvent> findByCustomerIdOrderByDateDescCreatedAtDesc(UUID customerId);
}
