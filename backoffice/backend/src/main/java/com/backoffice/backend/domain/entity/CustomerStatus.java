package com.backoffice.backend.domain.entity;

// Lowercase constant names on purpose: they serialize (Jackson) and persist (@Enumerated STRING)
// as-is, matching the Angular frontend's CustomerStatus union type exactly.
public enum CustomerStatus {
    active,
    finished
}
