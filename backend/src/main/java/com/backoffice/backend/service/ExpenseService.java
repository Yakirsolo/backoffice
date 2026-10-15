package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Expense;
import com.backoffice.backend.domain.repository.ExpenseRepository;
import com.backoffice.backend.dto.expense.ExpenseRequest;
import com.backoffice.backend.dto.expense.ExpenseResponse;
import com.backoffice.backend.dto.storage.UploadUrlRequest;
import com.backoffice.backend.dto.storage.UploadUrlResponse;
import com.backoffice.backend.exception.ApiException;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private static final Set<String> ALLOWED_RECEIPT_TYPES = Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/webp"
    );
    /** Receipts live only under this prefix (issued by {@link #createUploadUrl}). The client sends the key
        back on save, so we scope it here to stop a receipt pointing at - or deleting - any other object
        (e.g. a customer's document/photo) elsewhere in the bucket. */
    private static final String RECEIPT_KEY_PREFIX = "expenses/receipts/";

    private final ExpenseRepository expenseRepository;
    private final StorageService storageService;

    public List<ExpenseResponse> list() {
        return expenseRepository.findAllByOrderByDateDescCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public UploadUrlResponse createUploadUrl(UploadUrlRequest request) {
        if (!ALLOWED_RECEIPT_TYPES.contains(request.contentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported receipt type: " + request.contentType());
        }
        String key = storageService.buildKey("expenses/receipts", request.fileName());
        String url = storageService.createUploadUrl(key, request.contentType());
        return new UploadUrlResponse(url, key);
    }

    @Transactional
    public ExpenseResponse create(ExpenseRequest request) {
        Expense expense = new Expense();
        applyFields(expense, request);
        if (StringUtils.hasText(request.receiptStorageKey())) {
            attachReceipt(expense, request);
        }
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public ExpenseResponse update(UUID id, ExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Expense not found: " + id));

        applyFields(expense, request);

        if (StringUtils.hasText(request.receiptStorageKey())) {
            String previousKey = expense.getReceiptStorageKey();
            attachReceipt(expense, request);
            if (!Objects.equals(previousKey, expense.getReceiptStorageKey())) {
                deleteReceiptObject(previousKey);
            }
        } else if (Boolean.TRUE.equals(request.removeReceipt())) {
            clearReceipt(expense);
        }

        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Expense not found: " + id));

        deleteReceiptObject(expense.getReceiptStorageKey());
        expenseRepository.delete(expense);
    }

    private void applyFields(Expense expense, ExpenseRequest request) {
        expense.setAmount(request.amount());
        expense.setDate(request.date());
        expense.setCategory(request.category());
        expense.setDescription(request.description());
        expense.setNotes(StringUtils.hasText(request.notes()) ? request.notes() : null);
    }

    private void attachReceipt(Expense expense, ExpenseRequest request) {
        if (!ALLOWED_RECEIPT_TYPES.contains(request.receiptContentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported receipt type: " + request.receiptContentType());
        }
        if (!isReceiptKey(request.receiptStorageKey())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid receipt reference");
        }
        expense.setReceiptStorageKey(request.receiptStorageKey());
        expense.setReceiptContentType(request.receiptContentType());
        expense.setReceiptSizeBytes(request.receiptSizeBytes());
    }

    private void clearReceipt(Expense expense) {
        deleteReceiptObject(expense.getReceiptStorageKey());
        expense.setReceiptStorageKey(null);
        expense.setReceiptContentType(null);
        expense.setReceiptSizeBytes(null);
    }

    /** Deletes a stored receipt object, but never a key outside the receipts prefix (defence in depth
        against a legacy/tampered row pointing elsewhere in the bucket). */
    private void deleteReceiptObject(String key) {
        if (isReceiptKey(key)) {
            storageService.deleteObject(key);
        }
    }

    private boolean isReceiptKey(String key) {
        return StringUtils.hasText(key) && key.startsWith(RECEIPT_KEY_PREFIX);
    }

    private ExpenseResponse toResponse(Expense expense) {
        String receiptUrl = StringUtils.hasText(expense.getReceiptStorageKey())
                ? storageService.createDownloadUrl(expense.getReceiptStorageKey())
                : null;
        return ExpenseResponse.from(expense, receiptUrl);
    }
}
