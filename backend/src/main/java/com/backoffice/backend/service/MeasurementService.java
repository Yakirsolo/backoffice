package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.ProgressMeasurement;
import com.backoffice.backend.domain.entity.TimelineEventType;
import com.backoffice.backend.domain.repository.ProgressMeasurementRepository;
import com.backoffice.backend.dto.measurement.MeasurementCreateRequest;
import com.backoffice.backend.dto.measurement.MeasurementResponse;
import com.backoffice.backend.dto.measurement.MeasurementUpdateRequest;
import com.backoffice.backend.exception.ApiException;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MeasurementService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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

        syncCustomerFromMeasurements(customer, measurementRepository.findByCustomerIdOrderByDateAsc(customerId));

        timelineService.record(customerId, TimelineEventType.weight_update, request.date(),
                describeMeasurement(request.weight(), request.waist(), request.thigh(), request.hip()));

        return MeasurementResponse.from(measurement);
    }

    @Transactional
    public MeasurementResponse update(UUID customerId, UUID measurementId, MeasurementUpdateRequest request) {
        ProgressMeasurement measurement = measurementRepository.findById(measurementId)
                .filter(m -> m.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Measurement not found: " + measurementId));

        LocalDate oldDate = measurement.getDate();
        BigDecimal oldWeight = measurement.getWeight();
        BigDecimal oldWaist = measurement.getWaist();
        BigDecimal oldThigh = measurement.getThigh();
        BigDecimal oldHip = measurement.getHip();

        measurement.setDate(request.date());
        measurement.setWeight(request.weight());
        measurement.setWaist(request.waist());
        measurement.setThigh(request.thigh());
        measurement.setHip(request.hip());
        measurement = measurementRepository.save(measurement);

        var latest = measurementRepository.findByCustomerIdOrderByDateAsc(customerId);
        var customer = customerService.getEntityOrThrow(customerId);
        syncCustomerFromMeasurements(customer, latest);

        String changes = describeChanges(
                oldDate, oldWeight, oldWaist, oldThigh, oldHip,
                request.date(), request.weight(), request.waist(), request.thigh(), request.hip());
        timelineService.record(customerId, TimelineEventType.measurement_update, request.date(), changes);

        return MeasurementResponse.from(measurement);
    }

    @Transactional
    public void delete(UUID customerId, UUID measurementId) {
        ProgressMeasurement measurement = measurementRepository.findById(measurementId)
                .filter(m -> m.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Measurement not found: " + measurementId));

        var remaining = measurementRepository.findByCustomerIdOrderByDateAsc(customerId);
        if (remaining.size() <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "Cannot delete the customer's only measurement");
        }

        measurementRepository.delete(measurement);
        remaining.removeIf(m -> m.getId().equals(measurementId));

        var customer = customerService.getEntityOrThrow(customerId);
        syncCustomerFromMeasurements(customer, remaining);

        timelineService.record(customerId, TimelineEventType.measurement_deleted, LocalDate.now(),
                "מדידה מתאריך " + measurement.getDate().format(DATE_FMT) + ": "
                        + describeMeasurement(measurement.getWeight(), measurement.getWaist(), measurement.getThigh(), measurement.getHip()));
    }

    /** Measurements are the sole source of truth for a customer's start/current weight and start date. */
    private void syncCustomerFromMeasurements(Customer customer, List<ProgressMeasurement> sortedAsc) {
        customer.setStartDate(sortedAsc.get(0).getDate());
        customer.setStartWeight(sortedAsc.get(0).getWeight());
        customer.setCurrentWeight(sortedAsc.get(sortedAsc.size() - 1).getWeight());
    }

    private String describeMeasurement(BigDecimal weight, BigDecimal waist, BigDecimal thigh, BigDecimal hip) {
        StringBuilder sb = new StringBuilder(weight + " ק\"ג");
        if (waist != null) sb.append(" · היקף בטן ").append(waist).append(" ס\"מ");
        if (thigh != null) sb.append(" · היקף ירך ").append(thigh).append(" ס\"מ");
        if (hip != null) sb.append(" · היקף ישבן ").append(hip).append(" ס\"מ");
        return sb.toString();
    }

    private String describeChanges(
            LocalDate oldDate, BigDecimal oldWeight, BigDecimal oldWaist, BigDecimal oldThigh, BigDecimal oldHip,
            LocalDate newDate, BigDecimal newWeight, BigDecimal newWaist, BigDecimal newThigh, BigDecimal newHip
    ) {
        List<String> changes = new ArrayList<>();
        if (!oldDate.equals(newDate)) {
            changes.add("תאריך: מ-" + oldDate.format(DATE_FMT) + " ל-" + newDate.format(DATE_FMT));
        }
        if (changed(oldWeight, newWeight)) {
            changes.add("משקל: מ-" + fmt(oldWeight) + " ל-" + fmt(newWeight) + " ק\"ג");
        }
        if (changed(oldWaist, newWaist)) {
            changes.add("היקף בטן: מ-" + fmt(oldWaist) + " ל-" + fmt(newWaist) + " ס\"מ");
        }
        if (changed(oldThigh, newThigh)) {
            changes.add("היקף ירך: מ-" + fmt(oldThigh) + " ל-" + fmt(newThigh) + " ס\"מ");
        }
        if (changed(oldHip, newHip)) {
            changes.add("היקף ישבן: מ-" + fmt(oldHip) + " ל-" + fmt(newHip) + " ס\"מ");
        }
        return changes.isEmpty() ? "נשמר מחדש ללא שינוי" : String.join(" · ", changes);
    }

    private boolean changed(BigDecimal oldValue, BigDecimal newValue) {
        if (oldValue == null || newValue == null) return oldValue != newValue;
        return oldValue.compareTo(newValue) != 0;
    }

    private String fmt(BigDecimal value) {
        return value == null ? "—" : value.toString();
    }
}
