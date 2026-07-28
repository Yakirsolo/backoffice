package com.backoffice.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "timeline_events")
@Getter
@Setter
@NoArgsConstructor
public class TimelineEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimelineEventType type;

    @Column(nullable = false)
    private LocalDate date;

    private String description;

    /** Free-form JSON-encoded extra data, kept simple until an endpoint actually needs structured metadata. */
    @Column(columnDefinition = "text")
    private String metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public TimelineEvent(UUID customerId, TimelineEventType type, LocalDate date, String description) {
        this.customerId = customerId;
        this.type = type;
        this.date = date;
        this.description = description;
    }
}
