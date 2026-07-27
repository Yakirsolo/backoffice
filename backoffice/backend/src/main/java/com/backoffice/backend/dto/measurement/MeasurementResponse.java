package com.backoffice.backend.dto.measurement;

import com.backoffice.backend.domain.entity.ProgressMeasurement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MeasurementResponse(
        UUID id,
        UUID customerId,
        LocalDate date,
        BigDecimal weight,
        BigDecimal waist,
        BigDecimal thigh,
        BigDecimal hip
) {
    public static MeasurementResponse from(ProgressMeasurement m) {
        return new MeasurementResponse(m.getId(), m.getCustomerId(), m.getDate(), m.getWeight(), m.getWaist(), m.getThigh(), m.getHip());
    }
}
