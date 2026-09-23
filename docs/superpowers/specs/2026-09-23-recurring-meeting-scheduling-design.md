# Recurring Zoom meeting auto-scheduling

## Problem

Meetings are created one at a time, by hand, via the meeting dialog. The
coach wants every active customer to automatically get a recurring
check-in meeting (using the saved Zoom personal room) on a fixed cadence,
without manually creating each one.

## Goals

- Every customer's first meeting is created automatically, `startDate +
  cadence` out.
- When a meeting is marked completed, the next one is created
  automatically, anchored to *that meeting's own* date/time.
- The cadence is one global setting (day/week/month + a count), the same
  for every customer — no per-customer override.
- Auto-scheduling stops once a customer's status is `finished`. There is
  no separate "expiration date" concept.
- Existing active customers get backfilled once, so this isn't only for
  new signups.
- Meetings can be rescheduled (date/time/duration) and deleted — neither
  is possible today. A reschedule before completion changes the anchor
  the *next* meeting will be computed from. A delete is a deliberate
  skip: no replacement is created for it.

## Non-goals

- Google Calendar sync (separate, already-designed follow-up project;
  not part of this one).
- Per-customer cadence override.
- Any change to how `nextPaymentDate` works.

## Design

### Cadence setting

Two new columns on `users` (global, single-admin setting — same table
`zoom_personal_link` already lives on):

- `meeting_cadence_value` (int, default `1`)
- `meeting_cadence_unit` (reuses the existing `BillingIntervalUnit` enum:
  `day` / `week` / `month`, default `month`)

Editable in הגדרות, next to the Zoom card.

### Why a real row, not a computed value

CLAUDE.md documents that `nextPaymentDate` is computed on the fly, never
stored — the payments table only holds real recorded transactions. This
feature does the opposite on purpose: a real `Meeting` row is created
eagerly, because unlike a projected payment date, a scheduled meeting
needs to actually appear on the calendar, hold a Zoom link, and be a
concrete entity that can be rescheduled or completed.

### Scheduling logic

One method, `MeetingSchedulingService.ensureNextMeeting(Customer, LocalDate anchorDate, LocalTime anchorTime, String label, Integer durationMinutes, String zoomLink)`,
called from three places:

1. **Customer creation** (`CustomerService.create()`) — anchor =
   `customer.startDate`, `10:00`, label `"פגישה"`, duration `45`, Zoom
   link = the coach's saved personal room if set, else none. (Matches
   the meeting dialog's own current defaults.)
2. **Meeting marked completed** (`MeetingService.update()`, existing
   `justCompleted` branch) — anchor = the completed meeting's own
   date/time; label/duration/Zoom link copied from that meeting for
   continuity.
3. **Backfill** — an `ApplicationRunner` (same pattern as `AdminSeeder`)
   that runs on every boot: for every `active` customer with no future
   incomplete meeting, anchor off their most recent meeting's date if
   they have one, else `startDate`. It only ever acts on customers
   missing a future meeting, so after the first run it's a no-op —
   no "already ran" flag needed.

`ensureNextMeeting` computes the candidate date as
`anchorDate + cadence`, then only creates a `Meeting` row if:

- the customer's status is still `active` (this *is* the expiration
  check — no date comparison needed), and
- the customer has no other future, incomplete meeting already on the
  books (prevents duplicates if called more than once, or if the coach
  has manually added an extra meeting).

Because of that second guard, calling `ensureNextMeeting` again for a
customer who already has an upcoming meeting is a safe no-op — the
backfill runner can run on every boot without needing its own
"already ran" flag.

### Reschedule and delete

`MeetingUpdateRequest` gains three new optional fields: `date`, `time`,
`durationMinutes` (existing PATCH semantics: only non-null fields
apply). New endpoint: `DELETE /api/v1/customers/{customerId}/meetings/{meetingId}`,
removes the row outright — deleting an auto-scheduled meeting does not
trigger creating a replacement.

### Frontend

- הגדרות: cadence field (count + unit) next to the Zoom card.
- Meeting card (customer profile + calendar): edit and delete actions,
  reusing the meeting dialog for edit (pre-filled, date/time/duration
  now editable) with a delete button alongside.

## Error handling

Auto-scheduling failures (e.g. a bad cadence value) should not block the
triggering action — customer creation or marking a meeting completed
must still succeed even if `ensureNextMeeting` can't run. Log and move
on; the backfill runner will self-heal on the next boot since it's
idempotent.

## Testing

- Backend unit tests for `ensureNextMeeting`: cadence math for each unit,
  the `finished`-status skip, the "already has a future meeting" no-op
  guard, and the label/duration/Zoom-link carry-over on completion.
- Backend unit tests for reschedule (partial PATCH) and delete.
- Manual: create a customer, confirm the first meeting appears; mark it
  completed, confirm the next one appears with the right date; delete a
  meeting, confirm no replacement appears.
