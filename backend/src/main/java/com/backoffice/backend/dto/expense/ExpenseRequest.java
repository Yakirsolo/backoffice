package com.backoffice.backend.dto.expense;

import com.backoffice.backend.domain.entity.ExpenseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Shared by create (POST) and update (PATCH). Receipt handling on update is intentionally partial,
 * so the client never needs to hold (or echo back) a storage key just to keep an existing receipt:
 * <ul>
 *   <li>a receiptStorageKey present ⇒ attach/replace the receipt;</li>
 *   <li>otherwise removeReceipt=true ⇒ detach the current receipt;</li>
 *   <li>otherwise ⇒ leave the current receipt untouched.</li>
 * </ul>
 * On create only the first case applies.
 */
public record ExpenseRequest(
        @NotNull @Positive BigDecimal amount,
        @NotNull LocalDate date,
        @NotNull ExpenseCategory category,
        @NotBlank @Size(max = 200) String description,
        @Size(max = 2000) String notes,
        String receiptStorageKey,
        String receiptContentType,
        Long receiptSizeBytes,
        Boolean removeReceipt
) {
}
