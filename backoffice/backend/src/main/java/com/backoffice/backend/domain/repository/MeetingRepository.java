package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    List<Meeting> findByCustomerIdOrderByDateDescTimeDesc(UUID customerId);
    List<Meeting> findByDateAndCompletedFalseOrderByTime(LocalDate date);
    List<Meeting> findAllByOrderByDateAscTimeAsc();
}
