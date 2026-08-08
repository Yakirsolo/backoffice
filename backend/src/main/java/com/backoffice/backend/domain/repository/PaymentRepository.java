package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.Payment;
import com.backoffice.backend.domain.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByCustomerIdOrderByDateDesc(UUID customerId);
    List<Payment> findByStatusInOrderByDateAsc(Collection<PaymentStatus> statuses);
    List<Payment> findAllByOrderByDateDesc();
    List<Payment> findByStatusOrderByDateDesc(PaymentStatus status);
}
