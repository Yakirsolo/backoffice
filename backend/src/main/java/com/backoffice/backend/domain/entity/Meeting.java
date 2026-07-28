package com.backoffice.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "meetings")
@Getter
@Setter
@NoArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalTime time;

    @Column(nullable = false)
    private String type;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "zoom_link")
    private String zoomLink;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "reminder_enabled", nullable = false)
    private boolean reminderEnabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
