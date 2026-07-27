# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A Hebrew RTL back-office system for a nutrition coach to manage clients through a fat-loss coaching process (not just customer records — each client is modeled as a journey: measurements over time, payments, meetings, documents, and a history timeline). Two independent apps in one repo, no shared code between them:

- `frontend/` — Angular 19 (standalone components, signals), Hebrew/RTL, calls the backend over REST.
- `backend/` — Spring Boot 3.3.5 / Java 17, REST API + Postgres.

`request.md` is the original product spec (UI/UX requirements, entity list). `backend-prod-ready.md` is the follow-up spec for the production backend (auth, schema, API, deployment). Read these for *why* a feature looks the way it does before changing it.

## Commands

### Backend (`backend/`)
Requires a local Postgres running with a `backoffice_dev` database (trust-auth, no password, matches `application.yml` defaults — see `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` env vars to override). Java 17 must be the active `java`/`JAVA_HOME` (project targets 17; Spring Boot 3.3.5 will not build on 11 or run cleanly on other majors without checking compatibility first).

```bash
./mvnw compile              # compile only
./mvnw -DskipTests package  # build the runnable jar (target/backend-0.0.1-SNAPSHOT.jar)
java -jar target/backend-0.0.1-SNAPSHOT.jar   # run it (applies Flyway migrations on boot, seeds the admin user if the users table is empty)
./mvnw test                 # run tests (currently just the default context-load smoke test — no real test suite exists yet)
```

No Docker is used for local Postgres in this project — it runs via Homebrew (`brew services start postgresql@16`).

### Frontend (`frontend/`)
```bash
npm start          # ng serve, http://localhost:4200
npm run build      # ng build (production)
npm test           # ng test (karma/jasmine — scaffold default, no real specs written)
```

The API base URL is a hardcoded constant in `src/app/core/config/api-config.ts` (`http://localhost:8080/api/v1`), not an Angular environment file — update it there if the backend moves.

### Running both together
Backend on :8080, frontend on :4200. CORS on the backend is locked to a single allowed origin (`app.cors.allowed-origin`, defaults to `http://localhost:4200`) — update it (env var `CORS_ALLOWED_ORIGIN`) if the frontend is served from anywhere else, including a different local port.

## Architecture

### Backend: layered, one module per concern
`domain/entity` (JPA entities + enums) → `domain/repository` (Spring Data) → `service` (business logic, transactions) → `web` (`@RestController`s, thin). DTOs live under `dto/<area>` and are the only thing that crosses the API boundary — controllers and services never return entities directly.

Non-obvious conventions worth knowing before touching this layer:

- **Enum constants are deliberately lowercase** (`CustomerStatus.active`, `PaymentStatus.overdue`, `TimelineEventType.customer_created`, etc.) so that `@Enumerated(EnumType.STRING)` persistence and Jackson JSON serialization produce the *exact* string values the Angular `CustomerStatus`/`PaymentStatus`/`TimelineEventType` union types expect — no mapping/converter layer exists on either side. If you add a status value, add it in both places and keep the casing/spelling identical.
- **Timeline events are written by the service layer, not the client.** E.g. `PaymentService.create()`/`.update()` log a `payment_received` event when a payment becomes `paid`; `CustomerService.update()` logs `customer_finished`/`customer_reactivated` on a status flip. If you add a new mutation that should show up in a customer's היסטוריה tab, call `TimelineService.record(...)` from inside the relevant service method, not from the controller or the frontend.
- **`nextPaymentDate` is computed, never stored.** `CustomerService.computeNextPaymentDate()` derives it as `(most recent recorded payment's date, any status) + billing cadence`, falling back to the customer's start date if no payment exists yet. There is no "pending payment" row pre-created for future cycles — the payments table only ever holds real recorded transactions. When a customer's status flips to `finished`, `PaymentService.cancelOpenPaymentsForCustomer()` moves any still-open (`pending`/`overdue`) payments to `cancelled` so they stop appearing as due.
- **File uploads never touch the Spring Boot process.** `StorageService` only issues presigned S3-compatible (Cloudflare R2) PUT/GET URLs; the browser uploads/downloads directly. It throws a 503 if R2 env vars (`R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`) aren't set — expected in local dev, since storage isn't configured there.
- **Auth is stateless JWT**, access token in the response body (short-lived, ~15 min) + refresh token in an httpOnly/secure/SameSite=None cookie scoped to `/api/v1/auth`. There is no public registration endpoint by design — the only admin account is created by `AdminSeeder` (an `ApplicationRunner`) on first boot if the `users` table is empty, from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (required env vars, no default — the app fails to start without them). To add a second user today you'd insert one directly or extend the seeder — there's no "invite/create user" UI or endpoint yet.
- **Schema changes go through Flyway** (`src/main/resources/db/migration/V{n}__description.sql`, sequential, never edit a shipped migration). `spring.jpa.hibernate.ddl-auto` is `validate` — Hibernate will refuse to start if entities and schema disagree, so every entity field change needs a matching migration.

### Frontend: one stateful service as the data façade
`core/services/customers.service.ts` (`CustomersService`) is the single source of truth for customer-related data across the whole app — most feature components read from it rather than calling `HttpClient` directly:

- `customers`, `payments`, `meetings` are signals holding the **full collection**, fetched once on service construction and re-fetched after writes (`refreshCustomers()`/etc.). Synchronous helpers (`getCustomer(id)`, `paymentsFor(id)`, `meetingsFor(id)`) filter these cached signals — safe because a solo coach's dataset is small; this does not scale to a "load everything" model with many thousands of rows.
- Per-customer detail that isn't needed as a global list (measurements, documents, timeline) is fetched on demand via `*For$(customerId)` Observables, consumed inside the relevant profile tab component's `ngOnChanges`.
- Mutations (`addCustomer`, `addMeasurement`, `addMeeting`, `addPayment`, `updateCustomerStatus`) call the API then refresh the relevant cached signal(s); components don't manually patch the cache.

Auth: `AuthService` keeps the access token **in memory only** (a signal, not `localStorage`) and restores a session via the refresh cookie (`restoreSession()`) — this is what `core/guards/auth.guard.ts` calls when a route is entered with no in-memory token, e.g. after a page reload. `core/services/auth.interceptor.ts` attaches the bearer token to every request to `API_BASE_URL`, and on a 401 (not from `/auth/**`) attempts one silent refresh-and-retry before redirecting to `/login`.

Routing: everything under `ShellComponent` (the sidebar layout) is behind `authGuard`; `/login` is the only public route.

The customer profile (`features/customers/customer-profile/`) is tabbed (סקירה/התקדמות/היסטוריה/תשלומים/מסמכים/פגישות) with each tab a separate standalone component receiving `customerId` or the full `Customer` as `@Input()`, switched via `@switch` in the parent rather than child routes.

### Design system conventions (frontend)
- Hebrew RTL throughout (`<html dir="rtl">`); shared CSS variables and utility classes (`.card`, `.btn`, `.badge-*`, `.field-group`, etc.) live in `src/styles.scss` — reuse them instead of redefining per component.
- **Charts/time-series stay left-to-right even on this RTL page** — this is a deliberate, universal convention for reading dates/trends, not an RTL bug. See `shared/components/weight-chart/` (`direction: ltr` on the chart wrapper) if adding another chart.
- Status → color mapping (`shared/status-utils.ts`): green = success/paid/active, orange = warning/pending, red = danger/overdue, gray = neutral/finished/cancelled. Keep new statuses consistent with this rather than inventing new colors.
- `shared/status-utils.ts` also owns the small set of cross-cutting formatters (`formatDate`, `formatWeightChange`, `defaultProgramName`, `todayIso`, etc.) — check there before adding a one-off date/number formatting helper elsewhere.
