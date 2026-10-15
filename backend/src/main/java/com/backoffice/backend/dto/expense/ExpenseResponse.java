package com.backoffice.backend.dto.expense;

import com.backoffice.backend.domain.entity.Expense;
import com.backoffice.backend.domain.entity.ExpenseCategory;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseResponse(
        UUID id,
        BigDecimal amount,
        LocalDate date,
        ExpenseCategory category,
        String description,
        String notes,
        boolean hasReceipt,
        String receiptContentType,
        Long receiptSizeBytes,
        String receiptUrl,
        Instant createdAt
) {
    public static ExpenseResponse from(Expense e, String receiptUrl) {
        return new ExpenseResponse(
                e.getId(), e.getAmount(), e.getDate(), e.getCategory(), e.getDescription(), e.getNotes(),
                e.getReceiptStorageKey() != null, e.getReceiptContentType(), e.getReceiptSizeBytes(),
                receiptUrl, e.getCreatedAt());
    }
}
