package com.backoffice.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private Integer age;

    @Column(columnDefinition = "text")
    private String description;

    private String phone;
    private String instagram;
    private String facebook;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeadSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerStatus status;

    @Column(nullable = false)
    private String program;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "start_weight", nullable = false)
    private BigDecimal startWeight;

    @Column(name = "target_weight", nullable = false)
    private BigDecimal targetWeight;

    @Column(name = "current_weight", nullable = false)
    private BigDecimal currentWeight;

    @Column(name = "billing_interval_value", nullable = false)
    private int billingIntervalValue = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_interval_unit", nullable = false)
    private BillingIntervalUnit billingIntervalUnit = BillingIntervalUnit.month;

    @Column(name = "photo_storage_key")
    private String photoStorageKey;

    @Column(name = "needs_follow_up", nullable = false)
    private boolean needsFollowUp = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
