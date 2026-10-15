package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findAllByOrderByDateDescCreatedAtDesc();
}
