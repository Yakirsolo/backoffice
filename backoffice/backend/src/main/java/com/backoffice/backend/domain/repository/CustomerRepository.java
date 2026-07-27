package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID>, JpaSpecificationExecutor<Customer> {

    List<Customer> findByNeedsFollowUpTrue();

    List<Customer> findByStartDateBetween(LocalDate from, LocalDate to);
}
