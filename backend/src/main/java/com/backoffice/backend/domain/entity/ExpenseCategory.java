package com.backoffice.backend.domain.entity;

/**
 * Deliberately lowercase so {@code @Enumerated(EnumType.STRING)} persistence and Jackson JSON both
 * emit the exact strings the Angular {@code ExpenseCategory} union expects - no mapping layer.
 */
public enum ExpenseCategory {
    marketing,
    software,
    equipment,
    office,
    travel,
    taxes,
    other
}
