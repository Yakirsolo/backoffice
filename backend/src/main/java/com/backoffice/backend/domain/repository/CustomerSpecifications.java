package com.backoffice.backend.domain.repository;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

public final class CustomerSpecifications {

    private CustomerSpecifications() {
    }

    public static Specification<Customer> matching(CustomerStatus status, String search) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();

            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate phoneMatch = cb.like(root.get("phone"), "%" + search + "%");
                predicate = cb.and(predicate, cb.or(nameMatch, phoneMatch));
            }

            return predicate;
        };
    }
}
