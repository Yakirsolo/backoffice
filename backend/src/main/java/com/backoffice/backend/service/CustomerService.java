package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.*;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.CustomerSpecifications;
import com.backoffice.backend.domain.repository.PaymentRepository;
import com.backoffice.backend.domain.repository.ProgressMeasurementRepository;
import com.backoffice.backend.dto.customer.CustomerCreateRequest;
import com.backoffice.backend.dto.customer.CustomerResponse;
import com.backoffice.backend.dto.customer.CustomerUpdateRequest;
import com.backoffice.backend.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final ProgressMeasurementRepository measurementRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final TimelineService timelineService;

    public List<CustomerResponse> search(CustomerStatus status, String search) {
        var spec = CustomerSpecifications.matching(status, search);
        return customerRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toResponse)
                .toList();
    }

    public CustomerResponse getById(UUID id) {
        return toResponse(getEntityOrThrow(id));
    }

    Customer getEntityOrThrow(UUID id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Customer not found: " + id));
    }

    @Transactional
    public CustomerResponse create(CustomerCreateRequest request) {
        Customer customer = new Customer();
        customer.setName(request.name());
        customer.setAge(request.age());
        customer.setPhone(request.phone());
        customer.setDescription(request.description());
        customer.setProgram(request.program());
        customer.setStartDate(request.startDate());
        customer.setSource(request.source());
        customer.setStatus(CustomerStatus.active);
        customer.setStartWeight(request.startWeight());
        customer.setTargetWeight(request.targetWeight());
        customer.setCurrentWeight(request.startWeight());
        customer.setNeedsFollowUp(false);
        customer.setBillingIntervalValue(request.billingIntervalValue());
        customer.setBillingIntervalUnit(request.billingIntervalUnit());
        customer = customerRepository.save(customer);

        ProgressMeasurement measurement = new ProgressMeasurement();
        measurement.setCustomerId(customer.getId());
        measurement.setDate(request.startDate());
        measurement.setWeight(request.startWeight());
        measurement.setWaist(request.waist());
        measurement.setThigh(request.thigh());
        measurement.setHip(request.hip());
        measurementRepository.save(measurement);

        Payment payment = new Payment();
        payment.setCustomerId(customer.getId());
        payment.setAmount(request.price());
        payment.setDate(request.startDate());
        payment.setStatus(PaymentStatus.pending);
        paymentRepository.save(payment);

        timelineService.record(customer.getId(), TimelineEventType.customer_created, request.startDate(), null);

        return toResponse(customer);
    }

    @Transactional
    public CustomerResponse update(UUID id, CustomerUpdateRequest request) {
        Customer customer = getEntityOrThrow(id);

        if (request.name() != null) customer.setName(request.name());
        if (request.age() != null) customer.setAge(request.age());
        if (request.description() != null) customer.setDescription(request.description());
        if (request.phone() != null) customer.setPhone(request.phone());
        if (request.source() != null) customer.setSource(request.source());

        if (request.status() != null && request.status() != customer.getStatus()) {
            boolean becameFinished = request.status() == CustomerStatus.finished;
            TimelineEventType eventType = becameFinished
                    ? TimelineEventType.customer_finished
                    : TimelineEventType.customer_reactivated;
            timelineService.record(customer.getId(), eventType, LocalDate.now(), null);
            customer.setStatus(request.status());

            if (becameFinished) {
                paymentService.cancelOpenPaymentsForCustomer(customer.getId());
            }
        }

        if (request.program() != null) customer.setProgram(request.program());
        if (request.startDate() != null) customer.setStartDate(request.startDate());
        if (request.targetWeight() != null) customer.setTargetWeight(request.targetWeight());
        if (request.needsFollowUp() != null) customer.setNeedsFollowUp(request.needsFollowUp());
        if (request.billingIntervalValue() != null) customer.setBillingIntervalValue(request.billingIntervalValue());
        if (request.billingIntervalUnit() != null) customer.setBillingIntervalUnit(request.billingIntervalUnit());

        if (request.currentWeight() != null) {
            customer.setCurrentWeight(request.currentWeight());
        }

        return toResponse(customerRepository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        if (!customerRepository.existsById(id)) {
            throw new NotFoundException("Customer not found: " + id);
        }
        customerRepository.deleteById(id);
    }

    public List<Customer> needingFollowUp() {
        return customerRepository.findByNeedsFollowUpTrue();
    }

    public List<Customer> startedBetween(LocalDate from, LocalDate to) {
        return customerRepository.findByStartDateBetween(from, to);
    }

    public CustomerResponse toResponse(Customer customer) {
        return CustomerResponse.from(customer, computeNextPaymentDate(customer));
    }

    /**
     * Next payment is derived, not stored: the most recent recorded payment's date (any status)
     * plus one billing cycle, or the customer's start date if no payment has been recorded yet.
     */
    private LocalDate computeNextPaymentDate(Customer customer) {
        LocalDate anchor = paymentRepository.findByCustomerIdOrderByDateDesc(customer.getId()).stream()
                .findFirst()
                .map(Payment::getDate)
                .orElse(null);

        if (anchor == null) {
            return customer.getStartDate();
        }

        return switch (customer.getBillingIntervalUnit()) {
            case day -> anchor.plusDays(customer.getBillingIntervalValue());
            case week -> anchor.plusWeeks(customer.getBillingIntervalValue());
            case month -> anchor.plusMonths(customer.getBillingIntervalValue());
        };
    }
}
