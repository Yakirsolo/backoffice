# Recurring Zoom Meeting Auto-Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every active customer automatically gets a recurring meeting scheduled — the first one `startDate + cadence` after creation, the next one anchored to whichever meeting was just marked completed — on one global cadence setting, with meetings now reschedulable and deletable.

**Architecture:** A new `MeetingSchedulingService.ensureNextMeeting(...)`-style method (two public entry points: `scheduleFirstMeeting` / `scheduleNextMeeting`) is called from three places — `CustomerService.create()`, `MeetingService.update()`'s existing completion branch, and a new idempotent `ApplicationRunner` backfill — and is itself the enforcement point for both the "customer finished" stop condition and the "don't duplicate" guard. Meetings gain PATCH-able `date`/`time`/`durationMinutes` and a DELETE endpoint, neither of which exist today.

**Tech Stack:** Spring Boot 3.3.5 / Java 17 / Spring Data JPA / Flyway (backend), Angular 19 standalone components + signals (frontend), JUnit 5 + Mockito + AssertJ (all already on the backend test classpath via `spring-boot-starter-test`, currently unused — this plan writes the repo's first real unit tests).

**Spec:** [docs/superpowers/specs/2026-09-23-recurring-meeting-scheduling-design.md](../specs/2026-09-23-recurring-meeting-scheduling-design.md)

## Global Constraints

- Cadence is one global setting (`meeting_cadence_value` + `meeting_cadence_unit` on `users`), never per-customer.
- "Expiration" is enforced purely by `customer.status != active` — no separate expiration date field exists or is added.
- A `Meeting` row is created eagerly by the scheduler, unlike `nextPaymentDate` which stays computed-only — this is intentional, not an oversight (a scheduled meeting must be a real, editable, completable entity).
- Deleting a meeting never creates a replacement.
- The backfill runner must be safe to run on every boot (idempotent — no "already ran" flag).

## Review Focus

- Meeting marked completed for a customer whose status is already `finished` → scheduler must not create a next meeting.
- A meeting is deleted → no replacement meeting is created for it.
- A customer already has another future incomplete meeting when one is completed or backfilled → no duplicate is created.
- Settings update sends `meetingCadenceValue` ≤ 0 → rejected with a 4xx, not silently accepted (would otherwise let meetings drift to the same day repeatedly or land in the past).
- A meeting that is already completed gets a date/time PATCH → must not re-trigger scheduling (only the not-completed → completed transition schedules the next meeting).
- Scheduling throws (e.g. a bad cadence value slips through, or a transient DB error) → the triggering action (customer creation, marking a meeting completed, the backfill loop) must still succeed/continue, per the spec's error-handling section — a scheduling failure is logged and swallowed, never allowed to fail the caller.

---

## Task 1: Global meeting cadence setting

**Files:**
- Create: `backend/src/main/resources/db/migration/V10__add_meeting_cadence.sql`
- Modify: `backend/src/main/java/com/backoffice/backend/domain/entity/AppUser.java`
- Modify: `backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsResponse.java`
- Modify: `backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsUpdateRequest.java`
- Modify: `backend/src/main/java/com/backoffice/backend/service/UserService.java`
- Test: `backend/src/test/java/com/backoffice/backend/service/UserServiceTest.java`

**Interfaces:**
- Produces: `AppUser.getMeetingCadenceValue(): int`, `AppUser.getMeetingCadenceUnit(): BillingIntervalUnit` — read by `MeetingSchedulingService` in Task 3.
- Produces: `UserSettingsResponse.meetingCadenceValue: int`, `.meetingCadenceUnit: BillingIntervalUnit`.
- Produces: `UserSettingsUpdateRequest.meetingCadenceValue: Integer` (nullable), `.meetingCadenceUnit: BillingIntervalUnit` (nullable).

- [ ] **Step 1: Write the migration**

```sql
alter table users add column meeting_cadence_value integer not null default 1;
alter table users add column meeting_cadence_unit varchar(10) not null default 'month';
```

- [ ] **Step 2: Add the fields to `AppUser`**

In `backend/src/main/java/com/backoffice/backend/domain/entity/AppUser.java`, add after the existing `zoomPersonalLink` field:

```java
    @Column(name = "meeting_cadence_value", nullable = false)
    private int meetingCadenceValue = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "meeting_cadence_unit", nullable = false)
    private BillingIntervalUnit meetingCadenceUnit = BillingIntervalUnit.month;
```

(`BillingIntervalUnit` is already in the same `domain.entity` package — no new import needed.)

- [ ] **Step 3: Add the fields to the DTOs**

`backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsResponse.java` — full file:

```java
package com.backoffice.backend.dto.user;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;

public record UserSettingsResponse(
        String name,
        String businessName,
        String email,
        String phone,
        String zoomPersonalLink,
        int meetingCadenceValue,
        BillingIntervalUnit meetingCadenceUnit,
        boolean notifyPaymentReminders,
        boolean notifyFollowUp
) {
    public static UserSettingsResponse from(AppUser user) {
        return new UserSettingsResponse(
                user.getName(), user.getBusinessName(), user.getEmail(), user.getPhone(),
                user.getZoomPersonalLink(), user.getMeetingCadenceValue(), user.getMeetingCadenceUnit(),
                user.isNotifyPaymentReminders(), user.isNotifyFollowUp()
        );
    }
}
```

`backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsUpdateRequest.java` — full file:

```java
package com.backoffice.backend.dto.user;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;

/** All fields optional - only non-null fields are applied. */
public record UserSettingsUpdateRequest(
        String name,
        String businessName,
        String phone,
        String zoomPersonalLink,
        Integer meetingCadenceValue,
        BillingIntervalUnit meetingCadenceUnit,
        Boolean notifyPaymentReminders,
        Boolean notifyFollowUp
) {
}
```

- [ ] **Step 4: Apply the fields in `UserService`, with validation**

In `backend/src/main/java/com/backoffice/backend/service/UserService.java`, add the import `import com.backoffice.backend.exception.ApiException;` and `import org.springframework.http.HttpStatus;`, then in `updateSettings`, after the existing `zoomPersonalLink` line:

```java
        if (request.meetingCadenceValue() != null) {
            if (request.meetingCadenceValue() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "meetingCadenceValue must be at least 1");
            }
            user.setMeetingCadenceValue(request.meetingCadenceValue());
        }
        if (request.meetingCadenceUnit() != null) user.setMeetingCadenceUnit(request.meetingCadenceUnit());
```

- [ ] **Step 5: Write the failing tests**

Create `backend/src/test/java/com/backoffice/backend/service/UserServiceTest.java`:

```java
package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.repository.UserRepository;
import com.backoffice.backend.dto.user.UserSettingsUpdateRequest;
import com.backoffice.backend.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;

    private UserService service;
    private UUID userId;
    private AppUser user;

    @BeforeEach
    void setUp() {
        service = new UserService(userRepository);
        userId = UUID.randomUUID();
        user = new AppUser();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void updatesCadenceValueAndUnit() {
        var request = new UserSettingsUpdateRequest(null, null, null, null, 2, BillingIntervalUnit.week, null, null);

        var response = service.updateSettings(userId, request);

        assertThat(response.meetingCadenceValue()).isEqualTo(2);
        assertThat(response.meetingCadenceUnit()).isEqualTo(BillingIntervalUnit.week);
    }

    @Test
    void rejectsNonPositiveCadenceValue() {
        var request = new UserSettingsUpdateRequest(null, null, null, null, 0, null, null, null);

        assertThatThrownBy(() -> service.updateSettings(userId, request))
                .isInstanceOf(ApiException.class);
        verify(userRepository, never()).save(any());
    }
}
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=UserServiceTest -pl . -q` (from `backend/`)
Expected: both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V10__add_meeting_cadence.sql \
  backend/src/main/java/com/backoffice/backend/domain/entity/AppUser.java \
  backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsResponse.java \
  backend/src/main/java/com/backoffice/backend/dto/user/UserSettingsUpdateRequest.java \
  backend/src/main/java/com/backoffice/backend/service/UserService.java \
  backend/src/test/java/com/backoffice/backend/service/UserServiceTest.java
git commit -m "Add global meeting cadence setting"
```

---

## Task 2: Meeting reschedule and delete

**Files:**
- Modify: `backend/src/main/java/com/backoffice/backend/dto/meeting/MeetingUpdateRequest.java`
- Modify: `backend/src/main/java/com/backoffice/backend/domain/repository/MeetingRepository.java`
- Modify: `backend/src/main/java/com/backoffice/backend/service/MeetingService.java`
- Modify: `backend/src/main/java/com/backoffice/backend/web/MeetingController.java`
- Test: `backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java`

**Interfaces:**
- Produces: `MeetingUpdateRequest(LocalDate date, LocalTime time, Integer durationMinutes, String type, Boolean completed, String notes, String zoomLink)` — Task 9 (frontend) sends this shape, including `type` for the description field the reused dialog lets you edit.
- Produces: `MeetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(UUID, LocalDate): boolean` — consumed by `MeetingSchedulingService` in Task 3.
- Produces: `MeetingService.delete(UUID customerId, UUID meetingId): void`.
- Produces: `DELETE /api/v1/customers/{customerId}/meetings/{meetingId}` → 204.

- [ ] **Step 1: Add date/time/duration to `MeetingUpdateRequest`**

Full file, `backend/src/main/java/com/backoffice/backend/dto/meeting/MeetingUpdateRequest.java`:

```java
package com.backoffice.backend.dto.meeting;

import java.time.LocalDate;
import java.time.LocalTime;

/** All fields optional - only non-null fields are applied. */
public record MeetingUpdateRequest(
        LocalDate date,
        LocalTime time,
        Integer durationMinutes,
        String type,
        Boolean completed,
        String notes,
        String zoomLink
) {
}
```

- [ ] **Step 2: Add the existence-check query to `MeetingRepository`**

In `backend/src/main/java/com/backoffice/backend/domain/repository/MeetingRepository.java`, add:

```java
    boolean existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(UUID customerId, LocalDate date);
```

- [ ] **Step 3: Write the failing tests for reschedule and delete**

Create `backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java`:

```java
package com.backoffice.backend.service;

import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.dto.meeting.MeetingUpdateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingServiceTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private TimelineService timelineService;

    private MeetingService service;
    private UUID customerId;
    private UUID meetingId;
    private Meeting meeting;

    @BeforeEach
    void setUp() {
        service = new MeetingService(meetingRepository, timelineService);
        customerId = UUID.randomUUID();
        meetingId = UUID.randomUUID();

        meeting = new Meeting();
        meeting.setId(meetingId);
        meeting.setCustomerId(customerId);
        meeting.setDate(LocalDate.of(2026, 5, 1));
        meeting.setTime(LocalTime.of(9, 0));
        meeting.setType("פגישה");
        meeting.setCompleted(false);

        when(meetingRepository.findById(meetingId)).thenReturn(Optional.of(meeting));
        when(meetingRepository.save(any(Meeting.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void reschedule_updatesDateTimeAndDuration() {
        var request = new MeetingUpdateRequest(LocalDate.of(2026, 6, 10), LocalTime.of(14, 30), 30, null, null, null, null);

        var response = service.update(customerId, meetingId, request);

        assertThat(response.date()).isEqualTo(LocalDate.of(2026, 6, 10));
        assertThat(response.time()).isEqualTo(LocalTime.of(14, 30));
        assertThat(response.durationMinutes()).isEqualTo(30);
    }

    @Test
    void reschedule_updatesTheDescription() {
        var request = new MeetingUpdateRequest(null, null, null, "שיחת מעקב מעודכנת", null, null, null);

        var response = service.update(customerId, meetingId, request);

        assertThat(response.type()).isEqualTo("שיחת מעקב מעודכנת");
    }

    @Test
    void delete_removesTheMeeting() {
        service.delete(customerId, meetingId);

        verify(meetingRepository).delete(meeting);
    }
}
```

- [ ] **Step 4: Run the tests to verify they fail to compile / fail**

Run: `./mvnw test -Dtest=MeetingServiceTest -pl . -q` (from `backend/`)
Expected: compile error — `MeetingService` has no `delete` method yet and its constructor doesn't yet match a 2-arg call in isolation from field ordering (it currently takes `MeetingRepository, TimelineService` already, so this specific compile error is about the missing `delete` method).

- [ ] **Step 5: Apply date/time/duration in `update`, and add `delete`**

In `backend/src/main/java/com/backoffice/backend/service/MeetingService.java`, in the `update` method, after the existing `if (request.completed() != null) ...` line add (order doesn't matter, but place these first for readability):

```java
        if (request.date() != null) meeting.setDate(request.date());
        if (request.time() != null) meeting.setTime(request.time());
        if (request.durationMinutes() != null) meeting.setDurationMinutes(request.durationMinutes());
        if (request.type() != null) meeting.setType(request.type());
```

so the full field-assignment block reads:

```java
        if (request.date() != null) meeting.setDate(request.date());
        if (request.time() != null) meeting.setTime(request.time());
        if (request.durationMinutes() != null) meeting.setDurationMinutes(request.durationMinutes());
        if (request.type() != null) meeting.setType(request.type());
        if (request.completed() != null) meeting.setCompleted(request.completed());
        if (request.notes() != null) meeting.setNotes(request.notes());
        if (request.zoomLink() != null) meeting.setZoomLink(request.zoomLink());
        meeting = meetingRepository.save(meeting);
```

Then add a new method at the end of the class, before the closing brace:

```java
    @Transactional
    public void delete(UUID customerId, UUID meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId)
                .filter(m -> m.getCustomerId().equals(customerId))
                .orElseThrow(() -> new NotFoundException("Meeting not found: " + meetingId));
        meetingRepository.delete(meeting);
    }
```

- [ ] **Step 6: Add the DELETE endpoint**

In `backend/src/main/java/com/backoffice/backend/web/MeetingController.java`, add:

```java
    @DeleteMapping("/{meetingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID customerId, @PathVariable UUID meetingId) {
        meetingService.delete(customerId, meetingId);
    }
```

(`@DeleteMapping`/`@ResponseStatus`/`HttpStatus` are already imported via the existing `org.springframework.web.bind.annotation.*` and `org.springframework.http.HttpStatus` imports in that file.)

- [ ] **Step 7: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=MeetingServiceTest -pl . -q` (from `backend/`)
Expected: all 3 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/backoffice/backend/dto/meeting/MeetingUpdateRequest.java \
  backend/src/main/java/com/backoffice/backend/domain/repository/MeetingRepository.java \
  backend/src/main/java/com/backoffice/backend/service/MeetingService.java \
  backend/src/main/java/com/backoffice/backend/web/MeetingController.java \
  backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java
git commit -m "Add meeting reschedule and delete"
```

---

## Task 3: `MeetingSchedulingService`

**Files:**
- Create: `backend/src/main/java/com/backoffice/backend/service/MeetingSchedulingService.java`
- Test: `backend/src/test/java/com/backoffice/backend/service/MeetingSchedulingServiceTest.java`

**Interfaces:**
- Consumes: `MeetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual` (Task 2), `AppUser.getMeetingCadenceValue/Unit`, `getZoomPersonalLink` (Task 1 / existing).
- Produces: `MeetingSchedulingService.scheduleFirstMeeting(Customer customer): void` — consumed by Task 4.
- Produces: `MeetingSchedulingService.scheduleNextMeeting(Customer customer, Meeting anchorMeeting): void` — consumed by Task 5 and Task 6.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/java/com/backoffice/backend/service/MeetingSchedulingServiceTest.java`:

```java
package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingSchedulingServiceTest {

    @Mock private MeetingRepository meetingRepository;
    @Mock private UserRepository userRepository;

    private MeetingSchedulingService service;
    private AppUser admin;

    @BeforeEach
    void setUp() {
        service = new MeetingSchedulingService(meetingRepository, userRepository);
        admin = new AppUser();
        admin.setMeetingCadenceValue(1);
        admin.setMeetingCadenceUnit(BillingIntervalUnit.month);
        admin.setZoomPersonalLink("https://zoom.us/j/123");
    }

    private Customer activeCustomer() {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);
        customer.setStartDate(LocalDate.of(2026, 1, 1));
        return customer;
    }

    @Test
    void firstMeeting_isScheduledOneCadenceAfterStartDate() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        service.scheduleFirstMeeting(customer);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        Meeting saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(saved.getZoomLink()).isEqualTo("https://zoom.us/j/123");
        assertThat(saved.isCompleted()).isFalse();
    }

    @Test
    void nextMeeting_anchorsOnTheGivenMeetingsOwnDateNotToday() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(false);

        Meeting anchor = new Meeting();
        anchor.setCustomerId(customer.getId());
        anchor.setDate(LocalDate.of(2026, 3, 15));
        anchor.setTime(LocalTime.of(11, 30));
        anchor.setType("מעקב חודשי");
        anchor.setDurationMinutes(60);
        anchor.setZoomLink("https://zoom.us/j/999");

        service.scheduleNextMeeting(customer, anchor);

        ArgumentCaptor<Meeting> captor = ArgumentCaptor.forClass(Meeting.class);
        verify(meetingRepository).save(captor.capture());
        Meeting saved = captor.getValue();
        assertThat(saved.getDate()).isEqualTo(LocalDate.of(2026, 4, 15));
        assertThat(saved.getTime()).isEqualTo(LocalTime.of(11, 30));
        assertThat(saved.getType()).isEqualTo("מעקב חודשי");
        assertThat(saved.getDurationMinutes()).isEqualTo(60);
        assertThat(saved.getZoomLink()).isEqualTo("https://zoom.us/j/999");
    }

    @Test
    void doesNotSchedule_whenCustomerIsFinished() {
        Customer customer = activeCustomer();
        customer.setStatus(CustomerStatus.finished);

        service.scheduleFirstMeeting(customer);

        verify(meetingRepository, never()).save(any());
        verifyNoInteractions(userRepository);
    }

    @Test
    void doesNotSchedule_whenCustomerAlreadyHasAFutureIncompleteMeeting() {
        when(userRepository.findAll()).thenReturn(List.of(admin));
        Customer customer = activeCustomer();
        when(meetingRepository.existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(eq(customer.getId()), any()))
                .thenReturn(true);

        service.scheduleFirstMeeting(customer);

        verify(meetingRepository, never()).save(any());
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./mvnw test -Dtest=MeetingSchedulingServiceTest -pl . -q` (from `backend/`)
Expected: FAIL — `MeetingSchedulingService` does not exist.

- [ ] **Step 3: Write `MeetingSchedulingService`**

Create `backend/src/main/java/com/backoffice/backend/service/MeetingSchedulingService.java`:

```java
package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.AppUser;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Auto-schedules a customer's recurring meeting. Called on customer creation (first meeting),
 * on meeting completion (next meeting), and by the backfill runner - all three funnel through
 * the same guards, so calling this more than once for a customer who's already covered is a
 * safe no-op.
 */
@Service
@RequiredArgsConstructor
public class MeetingSchedulingService {

    private static final LocalTime DEFAULT_TIME = LocalTime.of(10, 0);
    private static final int DEFAULT_DURATION_MINUTES = 45;
    private static final String DEFAULT_LABEL = "פגישה";

    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    public void scheduleFirstMeeting(Customer customer) {
        if (customer.getStatus() != CustomerStatus.active) return;
        AppUser admin = getAdmin();
        if (admin == null) return;
        tryScheduleNext(customer, admin, customer.getStartDate(), DEFAULT_TIME,
                DEFAULT_LABEL, DEFAULT_DURATION_MINUTES, admin.getZoomPersonalLink());
    }

    public void scheduleNextMeeting(Customer customer, Meeting anchorMeeting) {
        if (customer.getStatus() != CustomerStatus.active) return;
        AppUser admin = getAdmin();
        if (admin == null) return;
        tryScheduleNext(customer, admin, anchorMeeting.getDate(), anchorMeeting.getTime(),
                anchorMeeting.getType(), anchorMeeting.getDurationMinutes(), anchorMeeting.getZoomLink());
    }

    private void tryScheduleNext(Customer customer, AppUser admin, LocalDate anchorDate, LocalTime anchorTime,
                                  String label, Integer durationMinutes, String zoomLink) {
        boolean hasFutureMeeting = meetingRepository
                .existsByCustomerIdAndCompletedFalseAndDateGreaterThanEqual(customer.getId(), LocalDate.now());
        if (hasFutureMeeting) return;

        LocalDate nextDate = switch (admin.getMeetingCadenceUnit()) {
            case day -> anchorDate.plusDays(admin.getMeetingCadenceValue());
            case week -> anchorDate.plusWeeks(admin.getMeetingCadenceValue());
            case month -> anchorDate.plusMonths(admin.getMeetingCadenceValue());
        };

        Meeting meeting = new Meeting();
        meeting.setCustomerId(customer.getId());
        meeting.setDate(nextDate);
        meeting.setTime(anchorTime);
        meeting.setType(label);
        meeting.setDurationMinutes(durationMinutes);
        meeting.setZoomLink(zoomLink);
        meeting.setCompleted(false);
        meetingRepository.save(meeting);
    }

    private AppUser getAdmin() {
        return userRepository.findAll().stream().findFirst().orElse(null);
    }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=MeetingSchedulingServiceTest -pl . -q` (from `backend/`)
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/backoffice/backend/service/MeetingSchedulingService.java \
  backend/src/test/java/com/backoffice/backend/service/MeetingSchedulingServiceTest.java
git commit -m "Add MeetingSchedulingService"
```

---

## Task 4: Schedule the first meeting on customer creation

**Files:**
- Modify: `backend/src/main/java/com/backoffice/backend/service/CustomerService.java`
- Test: `backend/src/test/java/com/backoffice/backend/service/CustomerServiceTest.java`

**Interfaces:**
- Consumes: `MeetingSchedulingService.scheduleFirstMeeting(Customer)` (Task 3).

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/backoffice/backend/service/CustomerServiceTest.java`:

```java
package com.backoffice.backend.service;

import com.backoffice.backend.domain.entity.BillingIntervalUnit;
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.LeadSource;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.PaymentRepository;
import com.backoffice.backend.domain.repository.ProgressMeasurementRepository;
import com.backoffice.backend.dto.customer.CustomerCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private ProgressMeasurementRepository measurementRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentService paymentService;
    @Mock private TimelineService timelineService;
    @Mock private MeetingSchedulingService meetingSchedulingService;

    private CustomerService service;

    @BeforeEach
    void setUp() {
        service = new CustomerService(customerRepository, measurementRepository, paymentRepository,
                paymentService, timelineService, meetingSchedulingService);
        when(customerRepository.save(any(Customer.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void creatingACustomer_schedulesTheirFirstMeeting() {
        CustomerCreateRequest request = new CustomerCreateRequest(
                "דנה כהן", 30, "0501234567", null, "חבילת 3 חודשים",
                BigDecimal.valueOf(500), 1, BillingIntervalUnit.month,
                LocalDate.of(2026, 4, 1), LeadSource.instagram,
                BigDecimal.valueOf(80), BigDecimal.valueOf(70), null, null, null
        );

        service.create(request);

        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(meetingSchedulingService).scheduleFirstMeeting(captor.capture());
        assertThat(captor.getValue().getStartDate()).isEqualTo(LocalDate.of(2026, 4, 1));
    }

    @Test
    void schedulingFailure_doesNotPreventCustomerCreation() {
        doThrow(new RuntimeException("boom")).when(meetingSchedulingService).scheduleFirstMeeting(any());

        CustomerCreateRequest request = new CustomerCreateRequest(
                "דנה כהן", 30, "0501234567", null, "חבילת 3 חודשים",
                BigDecimal.valueOf(500), 1, BillingIntervalUnit.month,
                LocalDate.of(2026, 4, 1), LeadSource.instagram,
                BigDecimal.valueOf(80), BigDecimal.valueOf(70), null, null, null
        );

        var response = service.create(request);

        assertThat(response).isNotNull();
        verify(customerRepository).save(any(Customer.class));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./mvnw test -Dtest=CustomerServiceTest -pl . -q` (from `backend/`)
Expected: compile error — `CustomerService`'s constructor doesn't accept a 6th `MeetingSchedulingService` argument yet, and `doThrow` needs `import static org.mockito.Mockito.doThrow;`.

- [ ] **Step 3: Wire the scheduler into `CustomerService.create()`, isolating failures**

In `backend/src/main/java/com/backoffice/backend/service/CustomerService.java`:
- Add `@Slf4j` to the class annotations (import `lombok.extern.slf4j.Slf4j`).
- Add a new final field **immediately after** the existing `private final TimelineService timelineService;` line: `private final MeetingSchedulingService meetingSchedulingService;`. Field order matters here — Lombok's `@RequiredArgsConstructor` generates constructor parameters in field-declaration order, and the test in Step 1 passes `meetingSchedulingService` as the last (6th) positional argument, so it must be the last field declared.
- In `create(...)`, right after `customer = customerRepository.save(customer);`, add:

```java
        try {
            meetingSchedulingService.scheduleFirstMeeting(customer);
        } catch (RuntimeException e) {
            log.warn("Failed to schedule first meeting for customer {}", customer.getId(), e);
        }
```

(A caught exception here does not roll back the surrounding `@Transactional` — only an exception that escapes the method does.)

- [ ] **Step 4: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=CustomerServiceTest -pl . -q` (from `backend/`)
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/backoffice/backend/service/CustomerService.java \
  backend/src/test/java/com/backoffice/backend/service/CustomerServiceTest.java
git commit -m "Schedule a customer's first meeting on creation"
```

---

## Task 5: Schedule the next meeting on completion

**Files:**
- Modify: `backend/src/main/java/com/backoffice/backend/service/MeetingService.java`
- Modify: `backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java`

**Interfaces:**
- Consumes: `MeetingSchedulingService.scheduleNextMeeting(Customer, Meeting)` (Task 3), `CustomerRepository.findById` (existing).

- [ ] **Step 1: Add the failing tests**

Append to `backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java` (inside the class, and update the imports/setUp as shown):

Add these imports:

```java
import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.repository.CustomerRepository;
import static org.mockito.Mockito.verifyNoInteractions;
```

Add these fields and update `setUp`/constructor call:

```java
    @Mock private CustomerRepository customerRepository;
    @Mock private MeetingSchedulingService meetingSchedulingService;

    private Customer customer;
```

Change the `service = new MeetingService(...)` line to:

```java
        service = new MeetingService(meetingRepository, timelineService, customerRepository, meetingSchedulingService);
```

and add, inside `setUp()`, after the existing `meeting` setup:

```java
        customer = new Customer();
        customer.setId(customerId);
        customer.setStatus(CustomerStatus.active);
```

Then add these test methods:

```java
    @Test
    void completingAMeeting_schedulesTheNextOne() {
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));

        service.update(customerId, meetingId, new MeetingUpdateRequest(null, null, null, null, true, null, null));

        verify(meetingSchedulingService).scheduleNextMeeting(customer, meeting);
    }

    @Test
    void reschedulingAnAlreadyCompletedMeeting_doesNotTriggerScheduling() {
        meeting.setCompleted(true);

        service.update(customerId, meetingId, new MeetingUpdateRequest(LocalDate.of(2026, 6, 1), null, null, null, true, null, null));

        verifyNoInteractions(meetingSchedulingService);
        verifyNoInteractions(customerRepository);
    }

    @Test
    void schedulingFailure_doesNotPreventCompletionFromSaving() {
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        doThrow(new RuntimeException("boom")).when(meetingSchedulingService).scheduleNextMeeting(any(), any());

        var response = service.update(customerId, meetingId, new MeetingUpdateRequest(null, null, null, null, true, null, null));

        assertThat(response.completed()).isTrue();
    }
```

Add `import static org.mockito.Mockito.doThrow;` to the test file's imports.

Also add `verifyNoInteractions(meetingSchedulingService);` to the existing `delete_removesTheMeeting` test, right after `verify(meetingRepository).delete(meeting);`, to pin that deleting never schedules a replacement.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./mvnw test -Dtest=MeetingServiceTest -pl . -q` (from `backend/`)
Expected: compile error — `MeetingService`'s constructor doesn't accept `CustomerRepository`/`MeetingSchedulingService` yet.

- [ ] **Step 3: Wire the scheduler into `MeetingService.update()`, isolating failures**

In `backend/src/main/java/com/backoffice/backend/service/MeetingService.java`:
- Add `@Slf4j` to the class annotations (import `lombok.extern.slf4j.Slf4j`).
- Add two new final fields **immediately after** the existing `private final TimelineService timelineService;` line, in this exact order: `private final CustomerRepository customerRepository;` then `private final MeetingSchedulingService meetingSchedulingService;` (add the `CustomerRepository` import too). Field order matters — Lombok's `@RequiredArgsConstructor` generates constructor parameters in field-declaration order, and the test in Step 1 calls `new MeetingService(meetingRepository, timelineService, customerRepository, meetingSchedulingService)`, so these two must be declared last, in that order.
- In `update(...)`, inside the `if (justCompleted) { ... }` block, after the existing `timelineService.record(...)` line, add:

```java
            try {
                customerRepository.findById(customerId)
                        .ifPresent(customer -> meetingSchedulingService.scheduleNextMeeting(customer, meeting));
            } catch (RuntimeException e) {
                log.warn("Failed to schedule next meeting for customer {}", customerId, e);
            }
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=MeetingServiceTest -pl . -q` (from `backend/`)
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/backoffice/backend/service/MeetingService.java \
  backend/src/test/java/com/backoffice/backend/service/MeetingServiceTest.java
git commit -m "Schedule the next meeting when one is marked completed"
```

---

## Task 6: Backfill existing customers

**Files:**
- Modify: `backend/src/main/java/com/backoffice/backend/domain/repository/CustomerRepository.java`
- Create: `backend/src/main/java/com/backoffice/backend/config/MeetingBackfillRunner.java`
- Test: `backend/src/test/java/com/backoffice/backend/config/MeetingBackfillRunnerTest.java`

**Interfaces:**
- Consumes: `MeetingSchedulingService.scheduleFirstMeeting`/`scheduleNextMeeting` (Task 3), `MeetingRepository.findByCustomerIdOrderByDateDescTimeDesc` (existing).
- Produces: `CustomerRepository.findByStatus(CustomerStatus): List<Customer>`.

- [ ] **Step 1: Add the repository query**

In `backend/src/main/java/com/backoffice/backend/domain/repository/CustomerRepository.java`, add:

```java
    List<Customer> findByStatus(CustomerStatus status);
```

(Add `import com.backoffice.backend.domain.entity.CustomerStatus;`.)

- [ ] **Step 2: Write the failing tests**

Create `backend/src/test/java/com/backoffice/backend/config/MeetingBackfillRunnerTest.java`:

```java
package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.service.MeetingSchedulingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingBackfillRunnerTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private MeetingRepository meetingRepository;
    @Mock private MeetingSchedulingService meetingSchedulingService;

    private MeetingBackfillRunner runner;

    @BeforeEach
    void setUp() {
        runner = new MeetingBackfillRunner(customerRepository, meetingRepository, meetingSchedulingService);
    }

    @Test
    void customerWithNoMeetingsAtAll_getsAFirstMeetingScheduled() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);
        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of());

        runner.run(null);

        verify(meetingSchedulingService).scheduleFirstMeeting(customer);
    }

    @Test
    void customerWithOnlyPastMeetings_getsNextMeetingScheduledFromTheMostRecent() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);

        Meeting pastMeeting = new Meeting();
        pastMeeting.setCustomerId(customer.getId());
        pastMeeting.setDate(LocalDate.now().minusMonths(1));
        pastMeeting.setCompleted(true);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of(pastMeeting));

        runner.run(null);

        verify(meetingSchedulingService).scheduleNextMeeting(customer, pastMeeting);
    }

    @Test
    void customerWithAFutureIncompleteMeeting_isSkipped() throws Exception {
        Customer customer = new Customer();
        customer.setId(UUID.randomUUID());
        customer.setStatus(CustomerStatus.active);

        Meeting futureMeeting = new Meeting();
        futureMeeting.setCustomerId(customer.getId());
        futureMeeting.setDate(LocalDate.now().plusDays(5));
        futureMeeting.setCompleted(false);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(customer));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId())).thenReturn(List.of(futureMeeting));

        runner.run(null);

        verifyNoInteractions(meetingSchedulingService);
    }

    @Test
    void oneCustomersSchedulingFailure_doesNotStopTheOthersFromBeingBackfilled() throws Exception {
        Customer failing = new Customer();
        failing.setId(UUID.randomUUID());
        failing.setStatus(CustomerStatus.active);
        Customer healthy = new Customer();
        healthy.setId(UUID.randomUUID());
        healthy.setStatus(CustomerStatus.active);

        when(customerRepository.findByStatus(CustomerStatus.active)).thenReturn(List.of(failing, healthy));
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(failing.getId())).thenReturn(List.of());
        when(meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(healthy.getId())).thenReturn(List.of());
        org.mockito.Mockito.doThrow(new RuntimeException("boom"))
                .when(meetingSchedulingService).scheduleFirstMeeting(failing);

        runner.run(null);

        verify(meetingSchedulingService).scheduleFirstMeeting(healthy);
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `./mvnw test -Dtest=MeetingBackfillRunnerTest -pl . -q` (from `backend/`)
Expected: FAIL — `MeetingBackfillRunner` does not exist.

- [ ] **Step 4: Write `MeetingBackfillRunner`, isolating per-customer failures**

Create `backend/src/main/java/com/backoffice/backend/config/MeetingBackfillRunner.java`:

```java
package com.backoffice.backend.config;

import com.backoffice.backend.domain.entity.Customer;
import com.backoffice.backend.domain.entity.CustomerStatus;
import com.backoffice.backend.domain.entity.Meeting;
import com.backoffice.backend.domain.repository.CustomerRepository;
import com.backoffice.backend.domain.repository.MeetingRepository;
import com.backoffice.backend.service.MeetingSchedulingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Ensures every active customer has a future meeting scheduled. Runs on every boot; it only
 * ever acts on customers missing a future meeting, so after the first run it's a no-op - no
 * "already ran" flag is needed. One customer's failure is logged and skipped rather than
 * aborting the loop (or, left unguarded, failing application startup entirely).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MeetingBackfillRunner implements ApplicationRunner {

    private final CustomerRepository customerRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingSchedulingService meetingSchedulingService;

    @Override
    public void run(ApplicationArguments args) {
        for (Customer customer : customerRepository.findByStatus(CustomerStatus.active)) {
            try {
                backfillOne(customer);
            } catch (RuntimeException e) {
                log.warn("Failed to backfill a meeting for customer {}", customer.getId(), e);
            }
        }
    }

    private void backfillOne(Customer customer) {
        List<Meeting> history = meetingRepository.findByCustomerIdOrderByDateDescTimeDesc(customer.getId());
        boolean hasFutureMeeting = history.stream()
                .anyMatch(m -> !m.isCompleted() && !m.getDate().isBefore(LocalDate.now()));
        if (hasFutureMeeting) {
            return;
        }

        if (history.isEmpty()) {
            meetingSchedulingService.scheduleFirstMeeting(customer);
        } else {
            meetingSchedulingService.scheduleNextMeeting(customer, history.get(0));
        }
    }
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `./mvnw test -Dtest=MeetingBackfillRunnerTest -pl . -q` (from `backend/`)
Expected: all 4 tests PASS.

- [ ] **Step 6: Run the full backend test suite**

Run: `./mvnw test -pl . -q` (from `backend/`)
Expected: all tests PASS (including the pre-existing `BackendApplicationTests` smoke test).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/backoffice/backend/domain/repository/CustomerRepository.java \
  backend/src/main/java/com/backoffice/backend/config/MeetingBackfillRunner.java \
  backend/src/test/java/com/backoffice/backend/config/MeetingBackfillRunnerTest.java
git commit -m "Backfill missing meetings for existing active customers"
```

---

## Task 7: Cadence setting in הגדרות

**Files:**
- Modify: `frontend/src/app/core/services/auth.service.ts`
- Modify: `frontend/src/app/features/settings/settings.component.ts`
- Modify: `frontend/src/app/features/settings/settings.component.html`
- Modify: `frontend/src/app/features/settings/settings.component.scss`

**Interfaces:**
- Consumes: `BillingIntervalUnit`, `BILLING_INTERVAL_UNIT_LABELS` from `core/models/customer.model.ts` (existing).
- Produces: `UserSettings.meetingCadenceValue: number`, `.meetingCadenceUnit: BillingIntervalUnit`; `UserSettingsUpdate.meetingCadenceValue?: number`, `.meetingCadenceUnit?: BillingIntervalUnit` — matches Task 1's backend DTOs field-for-field.

- [ ] **Step 1: Add the fields to the settings interfaces**

In `frontend/src/app/core/services/auth.service.ts`, add the import `import { BillingIntervalUnit } from '../models/customer.model';` at the top, then update the two interfaces:

```ts
export interface UserSettings {
  name: string;
  businessName: string | null;
  email: string;
  phone: string | null;
  zoomPersonalLink: string | null;
  meetingCadenceValue: number;
  meetingCadenceUnit: BillingIntervalUnit;
  notifyPaymentReminders: boolean;
  notifyFollowUp: boolean;
}

export interface UserSettingsUpdate {
  name?: string;
  businessName?: string;
  phone?: string;
  zoomPersonalLink?: string;
  meetingCadenceValue?: number;
  meetingCadenceUnit?: BillingIntervalUnit;
  notifyPaymentReminders?: boolean;
  notifyFollowUp?: boolean;
}
```

- [ ] **Step 2: Add the signals and save payload in `settings.component.ts`**

In `frontend/src/app/features/settings/settings.component.ts`, add the import:

```ts
import { BILLING_INTERVAL_UNIT_LABELS, BillingIntervalUnit } from '../../core/models/customer.model';
```

Add these class members (after `zoomPersonalLink = signal('');`):

```ts
  meetingCadenceValue = signal(1);
  meetingCadenceUnit = signal<BillingIntervalUnit>('month');
  cadenceUnitOptions: BillingIntervalUnit[] = ['day', 'week', 'month'];
  cadenceUnitLabels = BILLING_INTERVAL_UNIT_LABELS;
```

In the constructor's `getMySettings().subscribe(...)` callback, add:

```ts
      this.meetingCadenceValue.set(settings.meetingCadenceValue);
      this.meetingCadenceUnit.set(settings.meetingCadenceUnit);
```

In `save()`, add to the `updateMySettings({...})` payload object:

```ts
      meetingCadenceValue: this.meetingCadenceValue(),
      meetingCadenceUnit: this.meetingCadenceUnit(),
```

- [ ] **Step 3: Add the field to the template**

In `frontend/src/app/features/settings/settings.component.html`, add a new section right after the Zoom `</section>` (before the "התראות" section):

```html
    <section class="card panel">
      <h2 class="panel-title">פגישות אוטומטיות</h2>
      <div class="field-group">
        <label class="field-label">תדירות</label>
        <div class="meeting-cadence">
          <span>כל</span>
          <input
            class="input-field"
            type="number"
            min="1"
            [ngModel]="meetingCadenceValue()"
            (ngModelChange)="meetingCadenceValue.set($event)"
          />
          <select
            class="input-field"
            [ngModel]="meetingCadenceUnit()"
            (ngModelChange)="meetingCadenceUnit.set($event)"
          >
            @for (u of cadenceUnitOptions; track u) {
              <option [value]="u">{{ cadenceUnitLabels[u] }}</option>
            }
          </select>
        </div>
        <p class="field-hint">הפגישה הבאה של כל לקוחה תיקבע אוטומטית בתדירות הזו לאחר שהפגישה הקודמת שלה מסומנת כהתקיימה.</p>
      </div>
      <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
        {{ saving() ? 'שומרת...' : 'שמירת שינויים' }}
      </button>
    </section>
```

- [ ] **Step 4: Add the layout style**

In `frontend/src/app/features/settings/settings.component.scss`, add:

```scss
.meeting-cadence {
  display: grid;
  grid-template-columns: auto 90px 1fr;
  align-items: center;
  gap: var(--space-3);
}
```

- [ ] **Step 5: Manually verify**

Run `npm start` (from `frontend/`) with the backend up, open `/settings`, confirm the "פגישות אוטומטיות" card shows, change the cadence, save, refresh the page, and confirm the value persisted.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/core/services/auth.service.ts \
  frontend/src/app/features/settings/settings.component.ts \
  frontend/src/app/features/settings/settings.component.html \
  frontend/src/app/features/settings/settings.component.scss
git commit -m "Add meeting cadence setting to הגדרות"
```

---

## Task 8: `updateMeeting` / `deleteMeeting` in `CustomersService`

**Files:**
- Modify: `frontend/src/app/core/services/customers.service.ts`

**Interfaces:**
- Produces: `CustomersService.updateMeeting(customerId: string, meetingId: string, data: {...}): Observable<Meeting>`, `.deleteMeeting(customerId: string, meetingId: string): Observable<void>` — consumed by Tasks 10 and 11.

- [ ] **Step 1: Add the two methods**

In `frontend/src/app/core/services/customers.service.ts`, right after the existing `addMeeting(...)` method, add:

```ts
  updateMeeting(
    customerId: string,
    meetingId: string,
    data: { date?: string; time?: string; durationMinutes?: number; type?: string; completed?: boolean; notes?: string; zoomLink?: string }
  ) {
    return this.http.patch<Meeting>(`${API_BASE_URL}/customers/${customerId}/meetings/${meetingId}`, data)
      .pipe(tap(() => this.refreshMeetings()));
  }

  deleteMeeting(customerId: string, meetingId: string) {
    return this.http.delete<void>(`${API_BASE_URL}/customers/${customerId}/meetings/${meetingId}`)
      .pipe(tap(() => this.refreshMeetings()));
  }
```

- [ ] **Step 2: Manually verify it compiles**

Run: `npm run build` (from `frontend/`)
Expected: build succeeds with no new errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/core/services/customers.service.ts
git commit -m "Add updateMeeting and deleteMeeting to CustomersService"
```

---

## Task 9: Meeting dialog edit mode

**Files:**
- Modify: `frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.ts`
- Modify: `frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.html`

**Interfaces:**
- Consumes: `CustomersService.updateMeeting`/`addMeeting` (Task 8 / existing).
- Produces: new `@Input() meeting: Meeting | null` — consumed by Tasks 10 and 11 to open the dialog pre-filled for editing.

- [ ] **Step 1: Accept an optional `meeting` input and prefill on init**

In `frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.ts`:
- Add `OnInit` to the `@angular/core` import list.
- Add `import { Meeting } from '../../../core/models/customer.model';`.
- Add `implements OnInit` to the class declaration.
- Add the input, right after `@Input() customerId = '';`:

```ts
  @Input() meeting: Meeting | null = null;
```

- Add, right after the class's field declarations (after `saving = signal(false);`):

```ts
  isEdit = computed(() => !!this.meeting);
```

- Add an `ngOnInit` method (place it right before the existing `constructor()`):

```ts
  ngOnInit() {
    if (this.meeting) {
      this.date.set(this.meeting.date);
      this.time.set(this.meeting.time);
      this.description.set(this.meeting.type);
      this.durationMinutes.set(this.meeting.durationMinutes ?? null);
      this.zoomLink.set(this.meeting.zoomLink ?? '');
    }
  }
```

- [ ] **Step 2: Branch `save()` between create and update**

Replace the existing `save()` method body with:

```ts
  save() {
    if (!this.canSave()) return;
    this.saving.set(true);
    const payload = {
      date: this.date(),
      time: this.time(),
      // The API requires a label; the description doubles as it, with a neutral fallback.
      type: this.description().trim() || 'פגישה',
      durationMinutes: this.durationMinutes() ?? undefined,
      zoomLink: this.zoomLink().trim() || undefined
    };

    const request = this.meeting
      ? this.customersService.updateMeeting(this.targetCustomerId(), this.meeting.id, payload)
      : this.customersService.addMeeting(this.targetCustomerId(), payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.meeting ? 'הפגישה עודכנה' : 'הפגישה נקבעה');
        this.saved.emit();
        this.closed.emit();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('שמירת הפגישה נכשלה. בדקו את הפרטים ונסו שוב');
      }
    });
  }
```

- [ ] **Step 3: Update the template's title and button text**

In `frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.html`:

Replace:

```html
      <h3 id="meeting-dialog-title">פגישה חדשה</h3>
```

with:

```html
      <h3 id="meeting-dialog-title">{{ isEdit() ? 'עריכת פגישה' : 'פגישה חדשה' }}</h3>
```

Replace:

```html
      <button type="button" class="btn btn-primary" [disabled]="!canSave()" (click)="save()">
        {{ saving() ? 'שומר...' : 'שמירת פגישה' }}
      </button>
```

with:

```html
      <button type="button" class="btn btn-primary" [disabled]="!canSave()" (click)="save()">
        {{ saving() ? 'שומר...' : (isEdit() ? 'עדכון פגישה' : 'שמירת פגישה') }}
      </button>
```

- [ ] **Step 4: Manually verify it compiles**

Run: `npm run build` (from `frontend/`)
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.ts \
  frontend/src/app/shared/components/meeting-dialog/meeting-dialog.component.html
git commit -m "Add edit mode to the meeting dialog"
```

---

## Task 10: Mark completed / edit / delete on the customer profile

**Files:**
- Modify: `frontend/src/app/features/customers/customer-profile/tabs/meetings-tab.component.ts`

**Interfaces:**
- Consumes: `CustomersService.updateMeeting`/`deleteMeeting` (Task 8), `MeetingDialogComponent`'s `[meeting]` input (Task 9), `ConfirmDialogService.confirm` (existing, see `documents-tab.component.ts`).

- [ ] **Step 1: Inject the new services and add state**

In `frontend/src/app/features/customers/customer-profile/tabs/meetings-tab.component.ts`, add imports:

```ts
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LucidePencil, LucideTrash2, LucideCheck } from '@lucide/angular';
import { Meeting } from '../../../../core/models/customer.model';
import { formatDate as fmtDate } from '../../../../shared/status-utils';
```

(`formatDate` is already imported under that name in this file for the template — reuse the existing `formatDate` binding instead of a second import; skip the `fmtDate` alias above and just use the existing `formatDate` in the delete-confirmation message below.)

Add to the `imports: [...]` array in the `@Component` decorator: `LucidePencil, LucideTrash2, LucideCheck`.

Add these injected services and signal, alongside the existing `private customersService = inject(CustomersService);`:

```ts
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  editingMeeting = signal<Meeting | null>(null);
```

- [ ] **Step 2: Add the action methods**

Add these methods to the class:

```ts
  openCreate() {
    this.editingMeeting.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(m: Meeting) {
    this.editingMeeting.set(m);
    this.dialogOpen.set(true);
  }

  markCompleted(m: Meeting) {
    this.customersService.updateMeeting(this.customerId, m.id, { completed: true }).subscribe({
      error: () => this.toast.error('העדכון נכשל')
    });
  }

  async deleteMeeting(m: Meeting) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת פגישה',
      message: `למחוק את הפגישה מתאריך ${this.formatDate(m.date)}?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteMeeting(this.customerId, m.id).subscribe({
      error: () => this.toast.error('מחיקת הפגישה נכשלה')
    });
  }
```

- [ ] **Step 3: Wire the "new meeting" buttons to `openCreate()`**

In the inline `template`, replace both `(click)="dialogOpen.set(true)"` occurrences (the header button and the empty-state button) with `(click)="openCreate()"`.

- [ ] **Step 4: Add action buttons to each meeting card**

In the template, inside the `@for (m of meetings(); track m.id)` block, right after the `@if (m.zoomLink) { ... }` block and before the closing `</div>` of `.meeting-body`, add:

```html
                @if (!m.completed) {
                  <div class="meeting-actions">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="markCompleted(m)">
                      <svg lucideCheck class="icon"></svg> סימון כהתקיימה
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="עריכה" (click)="openEdit(m)">
                      <svg lucidePencil class="icon"></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="מחיקה" (click)="deleteMeeting(m)">
                      <svg lucideTrash2 class="icon"></svg>
                    </button>
                  </div>
                }
```

- [ ] **Step 5: Pass the editing meeting into the dialog**

Replace:

```html
    @if (dialogOpen()) {
      <app-meeting-dialog [customerId]="customerId" (closed)="dialogOpen.set(false)" />
    }
```

with:

```html
    @if (dialogOpen()) {
      <app-meeting-dialog [customerId]="customerId" [meeting]="editingMeeting()" (closed)="dialogOpen.set(false)" />
    }
```

- [ ] **Step 6: Add the actions row style**

In the component's `styles: [...]` array, add a new rule:

```scss
    .meeting-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
```

- [ ] **Step 7: Manually verify**

Run `npm start`, open a customer's פגישות tab. Confirm: "פגישה חדשה" still creates a meeting; a non-completed meeting shows סימון כהתקיימה/edit/delete; clicking סימון כהתקיימה flips it to "התקיימה" and removes the action row; edit pre-fills the dialog and updating changes the card; delete asks for confirmation and removes the card.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/features/customers/customer-profile/tabs/meetings-tab.component.ts
git commit -m "Add mark-completed, edit, and delete to the meetings tab"
```

---

## Task 11: Mark completed / edit / delete on the calendar page

**Files:**
- Modify: `frontend/src/app/features/calendar/calendar.component.ts`
- Modify: `frontend/src/app/features/calendar/calendar.component.html`
- Modify: `frontend/src/app/features/calendar/calendar.component.scss`

**Interfaces:**
- Consumes: same as Task 10, applied to the calendar's meeting rows.

- [ ] **Step 1: Inject the new services and add state**

In `frontend/src/app/features/calendar/calendar.component.ts`, add imports:

```ts
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { LucidePencil, LucideTrash2, LucideCheck } from '@lucide/angular';
import { Meeting } from '../../core/models/customer.model';
```

Add `LucidePencil, LucideTrash2, LucideCheck` to the `imports: [...]` array.

Add, alongside the existing `private customersService = inject(CustomersService);`:

```ts
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  editingMeeting = signal<Meeting | null>(null);
```

- [ ] **Step 2: Add the action methods**

Add these methods to the class (same logic as Task 10, but without a fixed `customerId` — each meeting carries its own):

```ts
  openCreate() {
    this.editingMeeting.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(m: Meeting) {
    this.editingMeeting.set(m);
    this.dialogOpen.set(true);
  }

  markCompleted(m: Meeting) {
    this.customersService.updateMeeting(m.customerId, m.id, { completed: true }).subscribe({
      error: () => this.toast.error('העדכון נכשל')
    });
  }

  async deleteMeeting(m: Meeting) {
    const confirmed = await this.confirmDialog.confirm({
      title: 'מחיקת פגישה',
      message: `למחוק את הפגישה מתאריך ${this.formatDate(m.date)}?`,
      confirmLabel: 'מחיקה',
      danger: true
    });
    if (!confirmed) return;
    this.customersService.deleteMeeting(m.customerId, m.id).subscribe({
      error: () => this.toast.error('מחיקת הפגישה נכשלה')
    });
  }
```

- [ ] **Step 3: Restructure the meeting row (an anchor can't contain buttons)**

In `frontend/src/app/features/calendar/calendar.component.html`, replace:

```html
              <a class="card meeting-row" [routerLink]="['/customers', m.customerId]">
                <div class="meeting-time tabular-nums">{{ formatTime(m.time) }}</div>
                <div class="meeting-info">
                  <div class="meeting-name">{{ m.customerName }}</div>
                  <div class="meeting-type">{{ m.type }}</div>
                </div>
                <span class="badge" [class.badge-success]="m.completed" [class.badge-neutral]="!m.completed">
                  {{ m.completed ? 'התקיימה' : 'מתוכננת' }}
                </span>
              </a>
```

with:

```html
              <div class="card meeting-row">
                <a class="meeting-row-link" [routerLink]="['/customers', m.customerId]">
                  <div class="meeting-time tabular-nums">{{ formatTime(m.time) }}</div>
                  <div class="meeting-info">
                    <div class="meeting-name">{{ m.customerName }}</div>
                    <div class="meeting-type">{{ m.type }}</div>
                  </div>
                </a>
                <span class="badge" [class.badge-success]="m.completed" [class.badge-neutral]="!m.completed">
                  {{ m.completed ? 'התקיימה' : 'מתוכננת' }}
                </span>
                @if (!m.completed) {
                  <div class="meeting-actions">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="markCompleted(m)">
                      <svg lucideCheck class="icon"></svg> סימון כהתקיימה
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="עריכה" (click)="openEdit(m)">
                      <svg lucidePencil class="icon"></svg>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm icon-only" title="מחיקה" (click)="deleteMeeting(m)">
                      <svg lucideTrash2 class="icon"></svg>
                    </button>
                  </div>
                }
              </div>
```

Also update both "פגישה חדשה"/"קביעת פגישה" buttons in this file from `(click)="dialogOpen.set(true)"` to `(click)="openCreate()"`, and update the dialog invocation at the bottom from:

```html
@if (dialogOpen()) {
  <app-meeting-dialog (closed)="dialogOpen.set(false)" />
}
```

to:

```html
@if (dialogOpen()) {
  <app-meeting-dialog [customerId]="editingMeeting()?.customerId ?? ''" [meeting]="editingMeeting()" (closed)="dialogOpen.set(false)" />
}
```

- [ ] **Step 4: Add layout styles for the new row structure**

In `frontend/src/app/features/calendar/calendar.component.scss`, find the existing `.meeting-row` rule (it was styling the `<a>` directly; it now styles the wrapping `<div>`) and add these alongside it:

```scss
.meeting-row-link {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.meeting-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
```

(Leave the existing `.meeting-row` flex/alignment rules in place — they now apply to the outer `<div>`, which needs the same `display: flex; align-items: center;` to lay out the link, badge, and actions in a row.)

- [ ] **Step 5: Manually verify**

Run `npm start`, open יומן. Confirm: clicking a meeting's time/name still navigates to the customer profile; a non-completed meeting shows the same three actions as the profile tab and they behave the same way; the badge and row layout still look correct.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/features/calendar/calendar.component.ts \
  frontend/src/app/features/calendar/calendar.component.html \
  frontend/src/app/features/calendar/calendar.component.scss
git commit -m "Add mark-completed, edit, and delete to the calendar page"
```
