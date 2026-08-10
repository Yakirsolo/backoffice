package com.backoffice.backend.web;

import com.backoffice.backend.dto.measurement.MeasurementCreateRequest;
import com.backoffice.backend.dto.measurement.MeasurementResponse;
import com.backoffice.backend.dto.measurement.MeasurementUpdateRequest;
import com.backoffice.backend.service.MeasurementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/measurements")
@RequiredArgsConstructor
public class MeasurementController {

    private final MeasurementService measurementService;

    @GetMapping
    public List<MeasurementResponse> list(@PathVariable UUID customerId) {
        return measurementService.listForCustomer(customerId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MeasurementResponse create(@PathVariable UUID customerId, @Valid @RequestBody MeasurementCreateRequest request) {
        return measurementService.create(customerId, request);
    }

    @PatchMapping("/{measurementId}")
    public MeasurementResponse update(
            @PathVariable UUID customerId,
            @PathVariable UUID measurementId,
            @Valid @RequestBody MeasurementUpdateRequest request
    ) {
        return measurementService.update(customerId, measurementId, request);
    }

    @DeleteMapping("/{measurementId}")
    public ResponseEntity<Void> delete(@PathVariable UUID customerId, @PathVariable UUID measurementId) {
        measurementService.delete(customerId, measurementId);
        return ResponseEntity.noContent().build();
    }
}
