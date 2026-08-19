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

`ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars are always required to start the app — even if the `users` table already has a row and `AdminSeeder` won't actually use them, Spring fails to resolve the `${ADMIN_EMAIL}`/`${ADMIN_PASSWORD}` placeholders in `application.yml` at boot without them. Use real values the first time (empty `users` table); any placeholder value works on subsequent runs.

```bash
brew services start postgresql@16   # start local Postgres if not already running (no Docker used here)

export ADMIN_EMAIL=dev@local.test ADMIN_PASSWORD=devLocalPass123   # only actually used to seed the admin on first boot (empty users table)

./mvnw compile              # compile only
./mvnw -DskipTests package  # build the runnable jar (target/backend-0.0.1-SNAPSHOT.jar)
java -jar target/backend-0.0.1-SNAPSHOT.jar   # run it (applies Flyway migrations on boot, seeds the admin user if the users table is empty)
# or, for dev with reload-on-recompile:
./mvnw spring-boot:run
./mvnw test                 # run tests (currently just the default context-load smoke test — no real test suite exists yet)
```

### Frontend (`frontend/`)
```bash
npm start          # ng serve --proxy-config proxy.conf.json, http://localhost:4200
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
- **File uploads never touch the Spring Boot process.** `StorageService` only issues presigned S3-compatible PUT/GET URLs; the browser uploads/downloads directly. It's provider-agnostic — `STORAGE_PROVIDER`/`STORAGE_ENDPOINT`/`STORAGE_REGION`/`STORAGE_BUCKET`/`STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` (`STORAGE_PROVIDER` defaults to `r2`, but production is actually configured for AWS S3 — see [Deployment (AWS)](#deployment-aws)) — and throws a 503 if endpoint/bucket/credentials aren't set, expected in local dev since storage isn't configured there.
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

## Deployment (AWS)

Everything runs on a single EC2 instance (`t4g.small`, Graviton/arm64, `il-central-1`) via Docker Compose — three containers (`postgres`, `backend`, `frontend`) on one Docker network, no RDS, no load balancer. `frontend`'s nginx is the only container that binds host ports (`80:80`, `443:443`); it serves the built Angular app, redirects HTTP → HTTPS, terminates TLS, and reverse-proxies `/api/` to `backend:8080` inside the compose network (`frontend/nginx.conf`), so `backend` is never exposed to the internet directly.

- **Domain/TLS**: the site is served at `https://backoffice-nutrition.duckdns.org` (free DuckDNS subdomain — real paid domains were considered but this was the fast/free option; see below for a caveat) pointed at a static **Elastic IP** (`16.164.65.4`, allocated and associated with the instance so it survives stop/start — without one the public IP is ephemeral and both DNS and `CORS_ALLOWED_ORIGIN` break on restart). TLS is a real Let's Encrypt cert obtained via standalone `certbot` (the `certbot/certbot` Docker image, not a host package — Amazon Linux 2023 doesn't ship certbot), stored at `/etc/letsencrypt` on the host and mounted read-only into the `frontend` container; renewal isn't automated yet (manual `certbot renew` re-run needed before the cert's ~90-day expiry). This matters beyond cosmetics: the refresh-token cookie (`AuthController`) is `Secure`+`SameSite=None`, which browsers silently drop on any non-HTTPS origin other than `localhost` — serving over plain HTTP (the raw EC2 IP) meant sessions couldn't survive a page refresh at all. **Caveat**: Chrome's client-side phishing heuristic has flagged this DuckDNS subdomain as a "deceptive site" warning on login at least once (confirmed via Google's official Safe Browsing transparency API that the domain is *not* actually blocklisted — likely a pattern-match against free dynamic-DNS domains generally, which are heavily abused for real phishing). Worth migrating to `is-a.dev` or a cheap real domain if this keeps recurring.
- **Networking**: security group `backoffice-sg` allows inbound 80 and 443 from anywhere, 22 (SSH) from a single admin IP only.
- **Secrets/config**: real secrets (`db_password`, `jwt_secret`, `storage_secret_key`, `storage_access_key_id`, `admin_password`) live in SSM Parameter Store under `/backoffice/*` as `SecureString`s — never in the repo, in GitHub Actions secrets, or hardcoded in scripts on the instance (a previous version of `fetch-env.sh` hardcoded the storage access key ID in plaintext; it's been rotated and moved into SSM like the rest — if you ever find a secret-shaped literal in a script on the instance, treat it as compromised and rotate it, don't just delete the line). `/home/ec2-user/app/fetch-env.sh` on the instance pulls all of them into a `.env` file that `docker compose` reads, including a fixed `CORS_ALLOWED_ORIGIN=https://backoffice-nutrition.duckdns.org` (previously derived from the instance's own ephemeral public IP — stale/wrong now that there's a real domain). That script runs on every deploy, right before `docker compose pull && up -d`.
- **File storage is AWS S3, not R2** — production's `.env` sets `STORAGE_PROVIDER=s3` against bucket `backoffice-<account-id>-storage` (`il-central-1`), via a dedicated IAM user (`backoffice-app-storage`) scoped to `s3:PutObject`/`s3:GetObject`/`s3:DeleteObject` on that bucket's objects. `StorageService` itself is provider-agnostic and would work against Cloudflare R2 too (`STORAGE_PROVIDER` defaults to `r2` when unset) — S3 is a deployment choice, not a code constraint. **Lesson learned**: the IAM policy originally only granted `PutObject`/`GetObject` — document and photo delete (`StorageService.deleteObject`) both 403'd in production for a while because nothing exercised that path until a real delete was attempted. If this bucket/policy is ever recreated, all three actions need to be granted together; don't assume upload-only permissions cover delete.
- **CI/CD**: `.github/workflows/deploy.yml` runs on every push to `main`, path-filtered so only the app(s) that changed get built. It authenticates to AWS via GitHub OIDC (`github-actions-deploy-role`, trust policy scoped to this exact repo+branch — no long-lived AWS keys stored in GitHub), builds arm64 images (matching the Graviton host) with Buildx+QEMU, pushes to ECR (`backoffice-backend`/`backoffice-frontend`, both `:latest`), then uses SSM `send-command` to run `fetch-env.sh` + `docker compose pull && up -d --remove-orphans` on the instance — no SSH keys involved in deploy.
- **Postgres is a plain container**, not RDS — data lives in a named Docker volume (`pgdata`) on the instance itself, with no automated backup/snapshot strategy.

Known gaps worth checking before assuming otherwise: no automated Let's Encrypt renewal (manual re-run needed before ~90-day expiry), no RDS backups, no S3 access logging or CloudTrail data-event trail (so individual object GET/PUT/DELETE calls aren't auditable after the fact — only account-level management events are), DuckDNS's phishing-heuristic caveat above.

### Design system conventions (frontend)
- Hebrew RTL throughout (`<html dir="rtl">`); shared CSS variables and utility classes (`.card`, `.btn`, `.badge-*`, `.field-group`, etc.) live in `src/styles.scss` — reuse them instead of redefining per component.
- **Charts/time-series stay left-to-right even on this RTL page** — this is a deliberate, universal convention for reading dates/trends, not an RTL bug. See `shared/components/weight-chart/` (`direction: ltr` on the chart wrapper) if adding another chart.
- Status → color mapping (`shared/status-utils.ts`): green = success/paid/active, orange = warning/pending, red = danger/overdue, gray = neutral/finished/cancelled. Keep new statuses consistent with this rather than inventing new colors.
- `shared/status-utils.ts` also owns the small set of cross-cutting formatters (`formatDate`, `formatWeightChange`, `defaultProgramName`, `todayIso`, etc.) — check there before adding a one-off date/number formatting helper elsewhere.
