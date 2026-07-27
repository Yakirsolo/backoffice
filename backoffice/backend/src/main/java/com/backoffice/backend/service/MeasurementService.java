package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.ProgressMeasurement;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.ProgressMeasurementRepository;
import com.backoffice.backend.dto.measurement.MeasurementCreateRequest;
import com.backoffice.backend.dto.measurement.MeasurementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeasurementService {

    private final ProgressMeasurementRepository measurementRepository;
    private final CustomerService customerService;
    private final TimelineService timelineService;

    public List<MeasurementResponse> listForCustomer(UUID customerId) {
        return measurementRepository.findByCustomerIdOrderByDateAsc(customerId).stream()
                .map(MeasurementResponse::from)
                .toList();
    }

    @Transactional
    public MeasurementResponse create(UUID customerId, MeasurementCreateRequest request) {
        var customer = customerService.getEntityOrThrow(customerId);

        ProgressMeasurement measurement = new ProgressMeasurement();
        measurement.setCustomerId(customerId);
        measurement.setDate(request.date());
        measurement.setWeight(request.weight());
        measurement.setWaist(request.waist());
        measurement.setThigh(request.thigh());
        measurement.setHip(request.hip());
        measurement = measurementRepository.save(measurement);

        customer.setCurrentWeight(request.weight());

        timelineService.record(customerId, TimelineEventType.weight_update, request.date(),
                request.weight() + " ק\"ג");

        return MeasurementResponse.from(measurement);
    }
}
