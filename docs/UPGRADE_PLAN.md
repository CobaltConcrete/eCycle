# eCycle: architecture, upgrade plan, and engineering log

Current database recovery (22 September 2026): [Database population, learning questions and verification](DATABASE_RESTORE.md). The configured Supabase PostgreSQL 17 database was reachable but empty. The November 10 archive has now been imported through the current schema: 718 locations, nine categories, 740 legacy user records and all remaining historical rows. Identity/RLS migration applied; zero Auth mappings, nine protected tables, five ID sequences verified. All source values matched after transfer. Live nearby searches passed for all three service types. Backend regression suite: 85 passed. This supersedes earlier unverified database statements below.

Current requested repair (22 September 2026): [Location and directions](LOCATION_DIRECTIONS_UPGRADE.md). Browser geolocation and Routes API migration are implemented; 81 backend tests, 29 frontend tests and production build pass. After the Google Cloud configuration update, a live walking route through the backend adapter passed (632 metres, five instructions and an encoded polyline). Full browser/device and authenticated application verification remains pending. The linked guide records the four learning questions, API setup and validation. This precedes the next tooling upgrade.

Last updated: 21 September 2026 (priority 1: Supabase Auth and API authorization). This is the living implementation record. **Implemented**, **planned**, and **unverified** are different statuses throughout this document. The original `SRS_Template.docx` is preserved.

**Current iteration:** [Authentication upgrade: the four learning questions, implementation and exact Supabase setup](AUTH_UPGRADE.md). Historical findings and validation records below describe the version at each stage; the current iteration supersedes the legacy-auth decisions. Work proceeds one priority at a time.

## 1. What the system does

eCycle helps people in Singapore find places to repair electronics, drop off e-waste, or recycle other items. A resident selects item categories, chooses a service, and sees the five nearest locations accepting **all** selected categories. Users can open a location's forum, post discussions, reply with images, and report comments. Shops maintain their location and accepted categories. Admins review reported comments. History records the five most recently viewed distinct shops, not confirmed recycling visits. Points currently count forum posts and undeleted comments; they are not evidence of environmental impact.

### Repository map

| Area | Purpose and findings |
| --- | --- |
| `frontend/ecycle-app/src/App.js` | React 18 SPA routing: login, signup, shop signup, checklist, service selection, map, forums, comments, moderation. |
| `src/pages/` | Feature screens and CSS. `Map.js` uses Google Maps directly, despite Leaflet dependencies also being installed. |
| `src/components/` | Supabase session provider, authenticated Axios client and route guards. Legacy pages still cache display metadata; it grants no API permission. Unused `UserContext` is outside the active app tree. |
| `backend/app.py`, `config.py`, `auth.py` | FastAPI app, CORS, native routers, Supabase identity validation and database-backed permissions. |
| `backend/controllers/` | Users/points, shops, checklist, nearby search/geocoding/directions, history, forums, comments, reports/classification. |
| `backend/database.py`, `schemas.py` | Request-scoped SQLAlchemy sessions and typed, validated API inputs; no Flask dependency. |
| `backend/models.py` | Eight original ORM tables plus `authidentity`; current schema and identity/RLS migration applied to configured Supabase on September 22. |
| `backend/_backend_data/SQL-scripts/` | Historical backups, individual table scripts, CSV import helpers; not a migration history. |
| `backend/_backend_data/locationCSV/` | Historical location datasets and preprocessing scripts. Duplicate filtered/username exports are snapshots, not live API synchronization. |
| `backend/_backend_data/oldapp.py`, `src/misc/`, `saveMap.js`, `Mapwith1indexerr.js`, `reportsave.js` | Old implementations and experiments outside the active route tree. Preserve until a separate cleanup confirms provenance. |
| `.github/workflows/` | Old Firebase deployment workflows run npm at the repository root, where there is no package.json, and lack checked-in Firebase configuration. Not a working deployment pipeline. |
| `frontend/run.*`, README files, root `test.py` | Historical launch instructions and scratch code. Root `test.py` is not a maintained regression suite. Use the root README added with this upgrade. |
| `docs/SRS_Template.docx` | November 2024 requirements, use cases, diagrams, and historical manual test results. These are specifications/evidence from that version, not proof today's code passes. |

The initial review covered the active application, schema definitions, configuration and deployment files, historical source/data inventory, and SRS text plus its embedded diagram/screenshot overview. At that stage archives had not been restored and external services were unverified. The September 22 database recovery and location guides record subsequent live verification; deployment and full browser authentication remain separate checks.

### Architecture and data model

```mermaid
flowchart LR
    Browser[React browser app] -->|JSON / REST with bearer token| API[FastAPI routers + Pydantic]
    Browser -->|Sign in and refresh| Auth[Supabase Auth]
    API -->|Validate token| Auth
    Browser -->|Public restricted key| Maps[Google Maps JavaScript]
    API --> ORM[SQLAlchemy]
    ORM --> PG[(PostgreSQL)]
    API --> Geo[Google geocoding / directions]
    Dumps[Historical custom-format backups] -. manual restore into empty sandbox .-> PG
```

| Table | Relationships / current storage |
| --- | --- |
| `usertable` | Integer ID, unique username, role, cached points. Old hashes are retained but not accepted by the API; new Auth-only accounts have an unusable password sentinel. |
| `authidentity` | Auth UUID string primary key, unique integer user FK, disabled flag. No browser Data API access. |
| `shoptable` | Shop ID is also a user ID; name, address, URL, action type, float latitude and misspelled `longtitude`. This couples public facilities to login accounts. |
| `checklistoptiontable` | Item category IDs and names. |
| `userchecklisttable` | Composite `(userid, checklistoptionid)` primary key; serves both resident preferences and shop acceptance. |
| `forumtable` | Shop, author, text limited to 255 characters, timestamp stored as string. |
| `commenttable` | Forum, author, optional parent comment, text, base64 image, string timestamp, deleted flag. |
| `reporttable` | Comment, reporter, string timestamp, duplicated danger score. No unique reporter/comment constraint. |
| `userhistorytable` | ORM key `(userid, shopid)` and string timestamp; controller retains five distinct shops. Historical DDL does not consistently declare this key. |

## 2. Where the database is

The application connects through `backend/config.py` → `DATABASE_URL` in `backend/.env` → Supabase PostgreSQL using psycopg2. This configured PostgreSQL 17 connection was verified on September 22, 2026, with TLS required, and the database is now populated. Credentials stay out of documentation and frontend code. Without configuration the fallback remains `localhost/ecycle`. Any Render deployment needs its own environment configuration; local verification does not verify deployment settings.

The repository contains backups, not a running database:

- `ecycle20241110.sql`: 3,790,952 bytes, custom PostgreSQL archive.
- `ecycleDB20241105.sql`: 762,542 bytes, custom PostgreSQL archive.
- `ecycleDBbackup`: 560,676 bytes, older backup.

Do not use `psql -f` on a `PGDMP` archive even if its filename ends in `.sql`. Use `pg_restore`; inspect the table of contents before restoring. The individual `create-*` files are plain SQL, but are not a consistent replacement for migrations. [PostgreSQL pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html).

**Recommendation:** keep PostgreSQL and use Supabase as the managed host if the original project is accessible. That preserves relational integrity and the existing SQLAlchemy code, while leaving room for PostGIS, Auth, and object storage. It is the most economical migration in engineering effort for this repository, not a claim that one host is universally fastest or cheapest. Compare actual regional latency, connection limits, storage/egress costs, and backup capabilities before selecting a plan. Do not provision a paid tier just for a portfolio demo.

## 3. Reconnect to Supabase

### Existing project and credentials

1. Sign in to the Supabase dashboard and select the original organization/project. Confirm its project reference and region. If it is paused, restore availability from the dashboard. If the old project is unavailable, use a new development project and retain the old backup separately.
2. Open **Connect** and copy the PostgreSQL connection URI. A persistent API server can use the direct connection when its network supports it; the shared pooler's **session mode** is an IPv4 alternative. Copy the exact host, port, and username from the dashboard rather than guessing a region or project reference. Supabase documents these connection choices and limits. [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).
3. Use the **database password**, not a publishable/anon API key. Reset the database password in the project database settings if forgotten; update all existing backend deployments that use it. Percent-encode special characters in the password portion of a URI. Keep TLS enabled with `sslmode=require`; for stricter certificate verification follow Supabase's CA/`verify-full` instructions. [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).
4. Copy `backend/.env.example` to `backend/.env` only if absent. Set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CORS_ORIGINS`. No application signing secret is needed for online Auth verification. The backend loads this file relative to `config.py`, before importing controllers. Hosting environments should use secret/environment settings instead of shipping `.env` files.
5. Configure frontend API URL, restricted Google browser key, `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY`. Restart development servers; rebuild deployed React assets. Follow the [Auth setup checklist](AUTH_UPGRADE.md) for email redirects, the required migration and account linking.

Example shape only—replace every placeholder using **Connect**:

```dotenv
# backend/.env only
DATABASE_URL=postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@EXACT_POOLER_HOST:5432/postgres?sslmode=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CORS_ORIGINS=http://localhost:3000,https://YOUR_FRONTEND_HOST
GOOGLE_MAPS_API_KEY=SERVER_RESTRICTED_KEY
```

The database password, service-role/secret keys, and classification-provider keys must never have `REACT_APP_` prefixes in frontend files. React build variables are public. The browser Maps key is necessarily public and should have referrer/API restrictions; use a separate backend key for geocoding. Legacy classification controllers still use old backend variable names and are awaiting replacement; do not copy those secrets into frontend configuration.

The app now uses **Supabase Auth**, requiring its project URL and publishable key. The PostgreSQL connection independently uses the database password, not an API key. Supabase Storage is still planned. Full Auth setup and migration instructions are in [the current priority guide](AUTH_UPGRADE.md).

### Verify and recover data

Install PostgreSQL client tools compatible with the archive/server version. First inspect offline:

```powershell
pg_restore --list backend/_backend_data/SQL-scripts/ecycle20241110.sql
```

Restore only into a **new empty development database/project**, after inspecting the archive's schemas and extensions. Supply the exact dashboard host/user through the flags and let `--password` prompt, avoiding a password in shell history:

```powershell
$env:PGSSLMODE = 'require'
pg_restore --host=EXACT_HOST --port=5432 --username=EXACT_USER --password --dbname=EMPTY_DEV_DATABASE --no-owner --no-privileges --exit-on-error backend/_backend_data/SQL-scripts/ecycle20241110.sql
```

Supabase's database name is commonly `postgres`; use the value shown in Connect. Do not add `--clean` or run this against an existing production schema. If the archive has incompatible ownership/extensions, first restore locally and export the application schema/data in a reviewed migration. Backups may contain historical users, password hashes, and comments: create sanitized fixtures before making a public demo.

For a read-only connectivity/schema check, from the repository root after configuring the backend environment:

```powershell
.venv\Scripts\python backend/check_database.py
```

This executes `SELECT 1` and checks all nine application tables, including `authidentity`, without printing the connection URI. It does not verify data correctness or RLS. Check row counts, foreign keys, sequences, account links, login, and a known checklist/location result before using restored data. `/health` is liveness only.

## 4. SRS gaps and release priorities

| SRS intention | Observed gap | Acceptance criterion |
| --- | --- | --- |
| JWT/OAuth and role-restricted functions | Browser stores returned password hash; mutations largely trust submitted IDs; UI checks are not authorization. | Verified identity on every protected API; owner/admin policy tested with another user's IDs; no hash leaves backend. |
| Temporarily block after more than eight failed logins | No throttling implementation. | Shared limiter/managed Auth controls tested; recovery flow avoids permanent lockout. |
| Nearby results in five seconds | Per-shop queries at baseline, legacy external integrations require reliability work; requests-based calls now have a 10-second timeout. | Measured latency including failures; first query-count fix implemented below. |
| 80% of first-time users find locations within one minute, three clicks | Login and checklist are mandatory; no guest discovery. | Observed usability sessions and a guest search flow; change the authentication precondition explicitly in SRS addendum. |
| Desktop and mobile | Fixed widths, global CSS collisions, clickable non-buttons, inconsistent errors. | Keyboard, 320/390/768/1440px layouts, text zoom, reduced motion, and real device checks. |
| Safe discussion / optional images | Base64 in rows, frontend 2000-character input versus database 255; weak API validation. | Agreed text limits, validated image pipeline, paginated replies, ownership and cross-forum reply tests. |
| 99.5% working-hour availability | No SLO measurement or recovery drill. | Defined measurement window, availability monitor, error budget, documented recovery test. |

The initial audit found hash-as-credential authentication and missing backend authorization. Priority 1 replaces both locally; live Auth setup, migration/RLS verification and account linking remain unverified. Public release still requires content/link and attachment review, provider rate/cost limits, and dependency remediation. Supabase RLS is not automatically enforced by a privileged SQLAlchemy connection: the migration denies browser Data API access while FastAPI explicitly enforces user permissions.

Other concrete defects to address: `/get-actiontype` frontend/backend route mismatch, repeated point recomputation over all users, delete/cascade differences between models and dumps, race-prone history updates, duplicate reports, maps script loading races and repeated map recreation, legacy classification SDK timeout/retry policy, and classification failures represented as low danger. Classification failure should be “pending review,” never evidence that content is safe.

## 5. Desktop, mobile, and user friendliness

**Visual direction:** warm off-white surfaces, deep green typography/buttons, muted category colors, generous spacing, clear headings, restrained imagery. Use shared tokens for colors, radii, and spacing; avoid adding a component framework just to recolor existing pages. This iteration introduces these on the app shell, sign-in, and service selection. Existing image assets are reused.

**Desktop next:** persistent navigation; a 360–420px results column alongside a map; selected-card/marker synchronization; visible accepted items, distance, address, and last-verified date. Keep account controls and primary actions in predictable places. Admin queues should expose sort state and human review outcomes.

**Mobile next:** list-first results, explicit List/Map switch, reachable location/search controls, collapsible filters, large tap targets, and safe-area spacing. A list should still work when map loading fails. Avoid nested scroll regions and deep reply indentation. Never substitute the viewer's approximate location for an invalid shop address.

**Reduce friction:** public discovery, optional sign-in for saved preferences/discussions; an editable item summary rather than mandatory full checklist on every visit; permission-based browser geolocation with postal-code fallback; location permission only when requested; skeleton/loading, retry, empty, offline, and unavailable-provider states. Replace alerts with inline errors. Confirm destructive operations with context.

**Accessibility:** real buttons/links, visible labels and focus, correctly structured landmarks, skip link, descriptive errors, non-color status labels, and focus management. Use native `details` for simple help. Validate color contrast and screen-reader behavior, including map alternatives; do not claim WCAG compliance from automated tests alone. Playwright supports device emulation and axe integration. [Emulation](https://playwright.dev/docs/emulation), [accessibility tests](https://playwright.dev/docs/accessibility-testing).

## 6. Storage and query efficiency

1. **Move attachments out of comment rows.** Store validated JPEG/WebP objects in Supabase Storage with object key, MIME type, byte size, dimensions, checksum, owner, and lifecycle status in PostgreSQL. Base64 encoding needs `4 * ceil(bytes / 3)` characters before JSON/row overhead—about 33% more than binary. Actual database disk savings depend on compression/TOAST and retained originals; measure `pg_total_relation_size`, not a theoretical percentage. Object storage also avoids retransmitting every image with every comment query. Use thumbnails, size limits, private access policies where needed, and signed URLs; never store expiring URLs as permanent identifiers. [Storage overview](https://supabase.com/docs/guides/storage).
2. **Migrate safely.** Add attachment metadata first, copy/decode historical images in bounded batches, checksum verification, dual-read fallback, then switch writes. Keep old data until verified and backed up. Use idempotent upload keys and an orphan cleanup grace period because an object-store upload and SQL commit are not one transaction. Do not delete old base64 in the initial migration.
3. **Use proper timestamp types.** Add UTC `timestamptz` columns, audit invalid old strings, determine the original timezone (the server-local timestamps do not prove Singapore time), backfill explicitly, then change reads/writes. Preserve history retention semantics unless intentionally revised.
4. **Decouple locations from accounts.** Introduce independent location IDs and optional ownership/claim records. Public collection bins should not require synthetic login accounts. Separate resident preferences and location-accepted categories; keep composite keys and foreign keys.
5. **Index measured access paths.** Candidates: `forumtable(shopid,time,forumid)`, `commenttable(forumid,time,commentid)`, `commenttable(replyid)`, `reporttable(commentid)`, and `userchecklisttable(checklistoptionid,userid)`. Deduplicate reports before a unique `(commentid,reporterid)` constraint. Benchmark index benefit and write/storage overhead; no index has been applied to a live database in this iteration.
6. **Spatial search at scale.** Add PostGIS `geography(Point,4326)`, populate with `ST_MakePoint(longtitude,latitude)` (longitude first), add GiST, use index-assisted radius candidates with `ST_DWithin`, and order by exact distance with stable ID tie-breaking. Geography distances are metres. Increasing-radius nearest-five search needs a stopping proof: stop when five qualifying locations are within the searched radius, otherwise expand. Confirm results against the brute-force geodesic oracle, including ties and boundary cases. [ST_DWithin](https://postgis.net/docs/ST_DWithin.html).
7. **Bound reads.** Cursor pagination on `(timestamp,id)` for discussions, fetch replies separately, eager-load authors, and request thumbnail metadata rather than base64. The search itself uses two SQL queries plus one identity/role lookup per request, but still computes distance for every qualifying shop in Python and materializes those candidates; it is not yet spatially indexed or constant-memory.
8. **Reproducible schema changes.** Add Alembic migrations after introspecting the restored schema, baseline accurately, and rehearse on an isolated PostgreSQL database. Do not pretend `db.create_all()` upgrades existing tables. Keep backup/restore evidence and migration roll-forward/rollback plans.

## 7. Tool choices and alternatives

These are recommendations unless the implementation log says otherwise. “Best” means best for the current constraints; confirm performance claims with measurements.

| Decision | Preferred approach | Why / alternative and tradeoff |
| --- | --- | --- |
| Frontend tooling | React + Vite, introduce TypeScript incrementally | Preserve routes/components while replacing deprecated CRA. Next.js is useful if public SEO/server rendering becomes a real requirement, but adds a server boundary without fixing current APIs. CRA is officially deprecated. [React announcement](https://react.dev/blog/2025/02/14/sunsetting-create-react-app). |
| UI | CSS tokens + reusable components, semantic HTML | Lowest migration cost; no CSS runtime. Tailwind is reasonable after team agreement; a full component library is useful for complex dialogs/tables but should not dictate every screen. |
| Server | FastAPI + Pydantic + standalone SQLAlchemy (implemented) | Typed request contracts, OpenAPI docs, and explicit session dependencies fit an API-first application. Flask remains suitable for small services; the migration has a maintenance cost and does not itself fix authorization or improve SQL performance. Synchronous DB routes use normal `def`, not blocking calls in `async def`. [FastAPI concurrency](https://fastapi.tiangolo.com/async/). |
| Data | PostgreSQL on Supabase | Relational joins/constraints and geographic extensions fit this domain. Firestore/MongoDB would require denormalization and complicate cross-entity consistency. Self-hosting adds operations work. |
| Identity | Supabase Auth (implemented locally; live setup pending) | Supabase validates tokens online; FastAPI maps UUIDs to integer IDs and checks database roles/ownership. Costs an Auth round trip per API request. Cached JWKS or HttpOnly sessions have different rotation, storage and CSRF tradeoffs. [Decision and setup](AUTH_UPGRADE.md). |
| Maps | Retain current provider during stabilization | Separate geocoding, map display, and routing behind adapters. Evaluate MapLibre with licensed tiles and a routing service later; an open-source map renderer does not itself supply free tiles or directions. |
| Testing | pytest + PostgreSQL integration tests; Playwright UI; k6 workloads | Unit tests prove invariants, real PostgreSQL tests prove SQL/migration behavior, browser tests prove flows, load tests quantify tails. Each has a different purpose. |
| Background jobs | PostgreSQL job table/outbox first | Transactional report creation plus idempotent processing. Add a queue service/Redis only after throughput, retries or scheduling justify the operational cost. |
| Observability | Structured logs, request IDs, timings, later OpenTelemetry | Measure SQL count, provider failures, pool waits, p50/p95/p99, error rates. Avoid logging tokens, passwords, addresses, or full user comments. |

Avoid speculative microservices, Kubernetes, a vector database, or an LLM chatbot as the headline feature. A correct, measured system with explainable tradeoffs is stronger evidence than an infrastructure list.

## 8. Features worth discussing in SWE / quant interviews

### A. Explainable constrained nearest-location search

Demonstrate set containment, spatial indexing, stable ordering and exactness checks. Extend to “cover all my items with the fewest stops” using a documented greedy set-cover heuristic, then a small exact solver as a benchmark oracle. Show a counterexample where greedy is suboptimal. Keep geographic distance separate from travel time and do not claim global route optimality.

### B. Reproducible performance laboratory

Create deterministic synthetic datasets at 1k/10k/100k locations, reproducible seeds, realistic category skew and geographically clustered points. Compare the old N+1 implementation, current SQL filtering, and PostGIS using identical datasets. Record hardware, versions, warm/cold cache state, concurrency, SQL count, CPU, memory, query plans, correctness agreement, throughput and p50/p95/p99. Publish raw results and scripts. Use k6 thresholds to make a regression fail a check. Targets (not achieved results): 100% oracle agreement, no per-result SQL queries, and an agreed p95 target on named hardware. [k6 thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

For quant SWE roles, emphasize deterministic computation, floating-point/distance behavior, profiling, tail latency, reproducibility and concurrency invariants. This is not a low-latency trading system; do not frame it as one. Implement an alternative optimized core only after profiling identifies a real hot path.

### C. Trustworthy ingestion and freshness

Idempotent location imports with source IDs, validation, provenance, freshness timestamps, deduplication and reviewable diffs. Quarantine invalid coordinates rather than silently relocating a shop. Track dataset version so a search or benchmark is replayable. Provide last-verified dates and “report incorrect location” with moderation.

### D. Reliable moderation workflow

Persist the report and outbox/job atomically, process asynchronously with bounded retries and a dead-letter/manual-review state, and record classifier version and outcome. Deduplicate submissions; a timeout must not label a comment safe. Evaluate on a labeled fixture set, report false-positive/negative rates, and retain human review. This demonstrates failure handling rather than merely calling an AI API.

### E. Concurrency-safe community activity

Move points to server-side transactional updates or an idempotent ledger, with a reconciliation query. Concurrent duplicate reports must not multiply reports/points. Test history updates, reply integrity and shop deletion under concurrency. Be explicit about event ordering and retry semantics; never claim exactly-once network delivery.

## 9. Delivery sequence and completion gates

| Stage | Deliverable | Gate |
| --- | --- | --- |
| 0 — current iteration | Repository/SRS audit, setup guide, entry-page refresh, safe admin registration restriction, query improvements, regression tests | Evidence below; no claim of production readiness. |
| 1 — secure foundation | Identity migration, server authorization, input schema, raw HTML removal, rate limits, dependency/Vite migration, CI | Cross-user/role abuse tests, dependency triage, end-to-end resident/shop/admin flows. |
| 2 — storage and discovery | Schema baseline, object storage migration, PostGIS, pagination, guest search and responsive map/list | Restore rehearsal, checksums, correctness oracle, accessibility and provider-failure tests. |
| 3 — differentiated engineering | Reproducible benchmark lab, ingestion provenance, multi-stop optimizer, durable moderation jobs | Published measurements, counterexamples, retry/concurrency tests, readable architecture decisions. |
| 4 — portfolio release | Hosted sanitized demo, screenshots/video, architecture diagram, measured before/after report | No release blockers; tested backups, health monitoring, demo costs/quotas and reset procedure. |

Each iteration should update this document in the same change. `AGENTS.md` records that maintenance rule for future work. There is no background scheduler or unattended upgrade process configured by this change.

## 10. First iteration implementation log — 21 September 2026

| Implemented change | Why and alternative considered | Evidence / limits |
| --- | --- | --- |
| Backend loads `.env` relative to config before controller imports; separate SECRET_KEY; configurable CORS; debug off; PORT honored; `/health` | Fix previously late env loading and deployment assumptions without rewriting the server. | Health is liveness only. Live DB/provider connectivity remains unverified. |
| Backend/frontend `.env.example` files; repaired ignore patterns; superseded unsafe historical examples; removed automatic Wi-Fi env rewriting on npm start | Clear secret boundary and reproducible startup. | Existing published credentials, if any, need rotation outside the repo. |
| Nearby query uses grouped SQL set containment | Two SQL statements instead of `2 + S` queries for S candidate shops; preserve all-items matching. | Query-count regression test, zero coordinates, invalid input, empty selections, no matches and ties. Python distance scan remains. |
| Exact distance ranking, stable shop-ID ties, top-five heap selection | Avoid rounding-induced ordering errors; selection is O(N log 5) rather than full O(N log N) sort. | No production latency/speedup claims; candidates still occupy O(N) memory. |
| Eager author loading for forum/comment lists | Avoid lazy author query per distinct author; no new cache infrastructure. | No pagination or attachment storage migration yet. |
| Public registration limited to user/shop, input shape/length validation | Close self-service admin creation; preserve existing signup payloads. | Regression test checks no admin row is created. Full authorization remains stage 1. |
| App shell, desktop two-column welcome, mobile single-column login, inline login errors, labels/autocomplete, focus/reduced-motion rules, sign-out storage cleanup | Clear hierarchy and accessible controls using existing React/CSS and image assets. | Not a complete redesign of every screen; see validation record. Sign-out does not revoke a server credential in the legacy auth model. |
| Three service cards are native buttons; help uses native details | Keyboard operation and responsive layout; removes inaccessible overlay and misleading classification guidance. | Resident flow remains authenticated until guest discovery is implemented. |
| Removed unused UserProvider from route tree; memoized checklist verification callback | Stop nonexistent endpoint request and repeated verification on each checkbox render. | Central auth/data fetching still needs refactoring. |
| Shop form now consumes geocoder `lng` correctly and rejects failed addresses | Previously destructured `lon` and fell back to viewer location with arbitrary offsets. | Live geocoding is unverified; no fabricated location is saved as fallback. |
| Replaced map popup HTML interpolation with DOM/textContent and safe website protocols; fixed manual-map geocoder longitude | Fix an existing nested-template-literal build error and prevent popup HTML injection. | Adversarial popup test; other user-provided links still need a full audit. |
| Added backend regression suite and replaced placeholder React test | Test actual behaviors instead of generated “learn React” text. | SQLite suite validates ORM logic, not PostgreSQL plans, RLS or migration behavior. |

### First iteration validation record (before FastAPI migration)

- Backend: `python -m pytest backend/tests -q` — **19 passed**, isolated in-memory SQLite, no cloud database writes.
- Frontend: `npm run build` - **passed with existing lint/toolchain warnings** (unused state, hook dependencies, invalid map anchors, CRA Babel and browser-list deprecations). Gzipped main JavaScript: 77.13 kB; CSS: 4.58 kB. These are build artifact sizes, not page-load performance measurements.
- Frontend: `npm test -- --watchAll=false --runInBand` - **2 suites / 2 tests passed**: labelled login/account creation and adversarial map-popup content. Legacy testing-library emits an act deprecation warning.
- Chromium browser smoke checks at **320, 390, 768 and 1440px**: no horizontal overflow on login/service selection; signup navigation, native help expansion and sign-out cleanup passed; no page JavaScript errors. Service-page identity verification was mocked. This is not a live authentication or full-device accessibility test.
- Visual review captured [desktop login](../artifacts/login-1440.png), [mobile login](../artifacts/login-390.png), [desktop services](../artifacts/services-1440.png) and [mobile services](../artifacts/services-390.png). These local artifacts are ignored by Git; regenerate or deliberately publish sanitized copies when preparing the portfolio.
- Flask app import and `/health` test-client smoke check - **passed** without opening a database connection.
- Dependency installation reported **68 advisories: 15 low, 15 moderate, 35 high, 3 critical** in the existing dependency graph. These are dependency audit findings, not 68 demonstrated app exploits. Triage direct/transitive/runtime/build-time exposure and replace the deprecated toolchain; no forced major upgrade was applied.
- No live Supabase restore, schema migration, production deployment, authenticated live workflow or external paid API request performed.

### Record for the next change

Work through priorities one at a time. Before implementation answer: (1) why the old solution is insufficient, (2) benefits, (3) limitations and watch-outs, and (4) alternatives and why not selected. Afterwards record implementation, actual tests, and required user setup. The current first priority is detailed in [Authentication upgrade](AUTH_UPGRADE.md).

For every stage add: trigger/problem, affected flow, implementation, alternatives and tradeoffs, invariant/tests, measured before/after with methodology, migration/rollback requirements, remaining risks, and next acceptance gate. Only add resume numbers after reproducible measurement.

## 11. FastAPI migration and revised stack decisions

### Decision and rationale

The backend now uses **FastAPI + Pydantic + Uvicorn + standalone SQLAlchemy**. This supersedes the earlier decision to retain Flask. The concrete reasons are declarative validation, discoverable API contracts, and explicit injectable database sessions. FastAPI is not universally better, and this migration is not evidence of a latency improvement. The SQL queries and database still determine much of the request cost. [FastAPI features](https://fastapi.tiangolo.com/features/).

All 41 business route/method pairs are implemented as native FastAPI routers, plus `/health`. There is no Flask mount or compatibility server. The existing PostgreSQL tables, primary keys, legacy column spelling, bcrypt hashes, and successful response payload shapes remain compatible. Swagger UI is at `/docs`, ReDoc at `/redoc`, and the OpenAPI schema at `/openapi.json`.

Database routes use synchronous `def` handlers because SQLAlchemy/psycopg2 are synchronous. FastAPI runs normal path functions in its thread pool. Declaring these functions `async def` while leaving blocking database/network calls would block the event loop. An end-to-end async migration is a separate performance decision: choose an async driver and HTTP client, avoid implicit lazy loading, use a session per concurrent task, and benchmark pool saturation and tail latency. Geodesic calculation is CPU work; async does not make it faster. [FastAPI concurrency](https://fastapi.tiangolo.com/async/), [SQLAlchemy asyncio](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html).

Each request gets a SQLAlchemy session from a `yield` dependency. Exceptions roll back, sessions close on exit, and no database schema is created at startup. This makes dependencies replaceable in tests and avoids Flask application context/global session coupling. The tradeoff is explicit session plumbing in every database handler. [Dependency cleanup](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/).

### Compatibility and rollout

- Invalid bodies, IDs, coordinate ranges, or text now return **422** with an `error` and sanitized `detail` array. Input values (including passwords) are omitted from validation errors. Numeric ID strings used by the current React client remain accepted. Duplicate usernames still return 400; uncaught relational conflicts return 409. Other existing controller-specific errors retain their previous statuses where handled locally.
- Forum/comment content is validated at 10–255 characters, matching the current database capacity and frontend minimum. Frontend textareas now cap input at 255. Supporting longer discussions should be a reviewed schema migration, not an implicit change during a framework swap.
- Unknown extra body fields are ignored by Pydantic for compatibility. Reply timestamps are server-generated. Legacy image data is bounded to 2,000,000 characters, but MIME/content validation and object storage are still pending.
- `database.py` uses `Config.DATABASE_URL`. The environment variable remains `DATABASE_URL`, so a valid existing PostgreSQL/Supabase connection string does not change. The read-only database check script uses the new setting.
- Python startup remains `python backend/app.py`; it now launches Uvicorn. Alternatively: `python -m uvicorn app:app --app-dir backend --host 127.0.0.1 --port 5000`. Deployments must use ASGI/Uvicorn rather than a Flask/Gunicorn WSGI command. The Docker default PORT and EXPOSE are now both 5000; `.dockerignore` excludes secrets, old dumps and tests.
- No schema migration, cloud operation, paid provider call or deployment was performed. Roll back the API changes as one coherent release (app, routers, models, dependencies, config and tests); reverting only the entry point would break imports. No data rollback is required by this migration itself.
- OpenAPI contains validated request schemas and a typed nearest-location response. Many other legacy responses are still explicit JSON responses with incomplete response schemas. Complete those before relying on generated TypeScript clients to guarantee end-to-end response types.

### What to switch next, in priority order

| Priority | Current approach → target | Concrete improvement | Tradeoff / why not the alternative? |
| --- | --- | --- | --- |
| P0 | Hash credential in localStorage → managed Auth + backend authorization | Expiring identity tokens, recovery flows, centralized identity verification; owner/admin checks remain in the API. Prefer Supabase Auth if using its platform. | Requires mapping integer users to Auth UUIDs and a plan for username-only accounts. Provider dependence and session handling remain real design work. Custom sessions are viable, but add revocation, CSRF and recovery responsibility. |
| P0 | Create React App → Vite + incremental TypeScript | Replace the deprecated build toolchain; catch client-side contract mistakes during development. | Migrate environment variables, tests, HTML entry and build configuration. Vite does not itself perform TypeScript type checking: add `tsc --noEmit`. Keep React; a Next.js rewrite has no clear benefit until SEO/server rendering is needed. |
| P1 | Repeated Axios/useEffect code → TanStack Query | Shared server-state cache, coordinated fetch status, refetch/invalidation, mutation lifecycle and less duplicated network code. | Cache keys and invalidation become correctness concerns; do not cache authentication decisions as a substitute for server checks. Start with checklist/location queries and conservative freshness settings. Redux is not necessary just to manage remote data. |
| P1 | Ad hoc DDL/dumps → Alembic | Versioned schema evolution and reviewed deployment steps. | Autogenerated migrations need review, particularly renames, data backfills and destructive operations. Baseline the actual database first; do not blindly stamp a mismatched schema. |
| P1 | Base64 comment images → Supabase Storage | Smaller relational payloads, independent object delivery and lifecycle management. | SQL and object writes are not atomic together: use staged uploads, checksums, access policies and orphan cleanup. Do not claim measured storage savings before migrating a sample. |
| P1 | Python scan of every matching shop → PostGIS geography/GiST | Index-assisted geographic candidate filtering and database-side distance queries. | Additional schema/index storage and geospatial correctness work. Keep the brute-force implementation as a test oracle. PostgreSQL remains the database; there is no need for a separate search cluster. |
| P2 | Handwritten JS payload contracts → generated TypeScript API types | Use FastAPI's OpenAPI schema to catch frontend/backend drift, such as the previous `lon`/`lng` mismatch. | Complete response schemas first; generated code still needs runtime error handling and cannot establish semantic correctness. |
| P2 | Loose Python dependency ranges → uv project + committed lockfile | Repeatable dependency resolution and consistent developer/CI environments. | One new workflow to learn; pip with a properly generated lock also works. Do not use `pip freeze` from a mixed development environment as a curated runtime manifest. |
| P2 | Manual QA → PostgreSQL integration CI + Playwright + k6 | Reproducible behavior, browser and performance evidence. | Fixture/database maintenance and flaky timing tests need discipline. SQLite tests cannot prove PostgreSQL migrations or query plans. |
| Later | Limited request logs → structured logs/metrics, then OpenTelemetry | Trace slow database/provider operations and observe p95/p99/error budgets. | Telemetry costs, cardinality and sensitive-data redaction require management. Add it around known operational questions. |

References: [Supabase JWT validation](https://supabase.com/docs/guides/auth/jwts), [Vite](https://vite.dev/guide/), [Vite TypeScript behavior](https://vite.dev/guide/features#typescript), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [Alembic](https://alembic.sqlalchemy.org/en/latest/), [PostGIS](https://postgis.net/docs/ST_DWithin.html), [uv](https://docs.astral.sh/uv/).

**Retain for now:** React, PostgreSQL, SQLAlchemy and the existing mapping provider. Continue with a modular monolith. Redis, Kafka, Kubernetes, microservices, GraphQL and a Rust/C++ rewrite would introduce substantial work without a demonstrated requirement. For quant SWE interviews, measured algorithmic correctness, predictable resource use and reproducible tail-latency results matter more than collecting frameworks.

### Implementation log

| Change | Why / tradeoff | Verification |
| --- | --- | --- |
| Replaced Flask app/blueprints with FastAPI app/eight routers; removed Flask runtime dependencies | Native ASGI and OpenAPI rather than wrapping the old WSGI app. | Route manifest asserts all 41 legacy business routes are documented. |
| Added Pydantic input models and nearest-location response model | Centralize validation and expose meaningful schemas. | Invalid writes, IDs, coordinates, duplicates and password-error redaction tested. |
| Replaced Flask-SQLAlchemy with standalone SQLAlchemy sessions | Explicit transaction ownership and independent tests. Existing Query API remains supported; a wholesale query rewrite was not needed. | Foreign-key conflict rollback and dependency rollback tests; nearest search still makes two SQL queries. |
| Replaced Flask-Bcrypt with bcrypt directly | Preserve standard bcrypt hashes without a Flask dependency. | Existing hash verification, registration and login compatibility tests. This is not a new session/authentication system. |
| Added ten-second timeouts to requests-based provider calls; encoded geocoding parameters | Bound connection/read waits and handle addresses containing `&`. A requests timeout is not an overall job deadline. | Mocked geocoding parameters and timeout-to-502 handling. Legacy classification SDK behavior is not modernized here. |
| Added Ruff and scoped backend configuration | One linter/formatter instead of separate formatting/import-sorting tools. Runtime behavior is unaffected. | Backend lint and format checks; old `_backend_data` scripts excluded. [Ruff](https://docs.astral.sh/ruff/). |
| Updated Uvicorn startup, Docker port/config and frontend text limits | Make the framework migration runnable and prevent database-length failures from the current UI. | ASGI tests and frontend build checks. Docker/cloud execution is not implied. |

### Migration validation record

- `python -m pytest backend/tests -q`: **35 passed**, including the final formatted backend. Uses isolated SQLite with foreign keys enabled and mocked provider calls; no live PostgreSQL/Supabase requests.
- Coverage includes request/schema contracts, all business route paths, signup/login/hash compatibility, role verification, checklist replacement rollback, shop CRUD, forums/comments/replies/reports, points, five-entry history, CORS, health, nearest-location query count, invalid inputs and provider timeout handling.
- The test client emits an upstream AnyIO/Starlette deprecation warning. This does not fail tests; dependency locking and upgrade review remain planned.
- Uvicorn HTTP smoke check on loopback: `/health`, `/openapi.json` and `/docs` returned 200 without a database connection.
- `ruff check backend` and `ruff format --check backend`: passed.
- Frontend component tests: **2 suites / 2 tests passed** after aligning discussion text limits; the existing testing-library deprecation warning remains.
- Frontend production build: **passed with existing lint/toolchain warnings** after the final text-limit cleanup; main gzip JavaScript 77.13 kB, CSS 4.58 kB.
- Historical Flask import helpers remain archived and unsupported by the new runtime; they already referenced obsolete model names. The optional pandas requirements file is for CSV preprocessing, not a working importer.
- At the end of this framework migration, blockers included hash authentication, missing authorization, dependency advisories, legacy AI behavior and unverified live services. The subsequent Auth iteration below supersedes the first two and retires legacy AI routes.

## 12. Priority 1 implementation: managed Auth and API permissions

The four learning questions were documented before implementation in [AUTH_UPGRADE.md](AUTH_UPGRADE.md): the old failure, new benefit, new limitations, and alternatives. That guide includes credential locations, environment variables, migration, existing-account linking, rollback considerations and validation.

Implemented: managed email sessions and recovery, server-validated identity, unique UUID-to-integer mapping, owner/admin permissions across the API, disabled-account checks, retirement of permanent hash credentials, manual reporting, and server-side points updates. Legacy AI routes are retired and their unused OpenAI runtime dependency is removed; new reports do not receive an automatic low-danger label in the moderation UI.

Validated locally with 65 backend tests and 15 frontend tests; production build passes with existing warnings. Live project configuration, email delivery, PostgreSQL migration/RLS and deployment remain unverified. The next code priority is Vite plus incremental TypeScript, after completing/reviewing the Auth rollout checklist. No unattended upgrade service is configured.
