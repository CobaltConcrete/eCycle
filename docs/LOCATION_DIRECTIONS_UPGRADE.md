# Location and directions repair — 22 September 2026

Decision recorded before implementation. This user-requested repair takes priority over the planned frontend tooling migration.

## 1. Why was the old solution insufficient?

The browser sent a website-restricted key to Google's Geolocation REST endpoint instead of asking the device for its location. The backend equivalent could locate the server's network rather than the visitor. Directions used Google's legacy API, unavailable to new Cloud projects. Module-global origin/destination/mode variables survived navigation, multiple map instances competed, manual addresses did not update the history origin, zero coordinates were rejected by truthiness checks, and late responses could overwrite newer selections.

## 2. Benefits of the new solution

Use `navigator.geolocation.getCurrentPosition` on an explicit user action, with permission/timeout messages and manual-address fallback. Use one map instance per mounted page, component-owned state and stale-request protection. FastAPI calls Routes API `computeRoutes` with its server key and a narrow field mask; React draws the returned encoded polyline and displays text instructions. Nearby and history selections use the same routing path, including transport-mode changes. Keep existing Google map display, geocoding, authentication, checklist matching and five-entry history.

## 3. Limitations and watch-outs

Browser geolocation requires permission and a secure context (HTTPS or localhost); accuracy varies by device and surroundings. Manual geocoding remains a fallback. Routes requires billing, API enablement, and backend key restrictions. Proxying it adds a backend hop and consumes API quota; request cancellation prevents stale UI results but does not guarantee cancellation of a provider computation already started. No traffic-aware optimization or latency improvement is claimed. Walking/cycling coverage and transit availability vary; display provider warnings and empty-route errors. Rate limiting remains separate release work.

## 4. Alternatives and why not chosen

- Google's Geolocation REST API: useful for clients with radio-network observations; not needed for ordinary browser location and incompatible with our website-restricted key setup.
- Keep legacy Directions: incompatible with new projects, so not a durable fix.
- Google Maps JavaScript Route class: viable and removes the backend hop, but the backend adapter gives us a validated, authenticated contract and central handling of provider failures and server credentials.
- External Google Maps directions link only: simplest fallback, but loses in-app route display and instructions.
- Switch to MapLibre plus another router: viable later, but replaces multiple providers and does not directly fix the current integration at lower migration cost.

Sources: [browser geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition), [Routes request contract](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes), [legacy API migration](https://developers.google.com/maps/legacy).

## Setup and validation

Implemented: explicit browser geolocation with a 10-second timeout and address fallback; one map instance with cleaned-up markers/polylines; geometry-only SDK loading with failure/retry handling; normalized history coordinates; request cancellation and stale-result guards; authenticated Routes API calls for all four travel modes; route distance, duration, text instructions, transit stop/line fallback and warnings. Directions no longer depend on legacy `DirectionsService`/`DirectionsRenderer`. The unused server geolocation endpoint returns 410 rather than inferring a visitor's location from the server network. No database migration is required.

### Google Cloud setup for this version

| Key / environment variable | Enable and allow these APIs | Application restrictions |
| --- | --- | --- |
| Frontend `REACT_APP_GOOGLE_MAPS_API_KEY` | Maps JavaScript API | Websites: `http://localhost:3000/*`, `http://127.0.0.1:3000/*`, and exact production origins |
| Backend `GOOGLE_MAPS_API_KEY` | Geocoding API and Routes API | Server public egress IPs where available; not website referrers |

Open [Routes API](https://console.cloud.google.com/apis/library/routes.googleapis.com), select the project owning the backend key, and enable it. Then open [Credentials](https://console.cloud.google.com/apis/credentials), edit the **backend** key, and add **Routes API** under API restrictions. Enabling a service and allowing it on a restricted key are separate steps. Keep Google Maps billing configured. No new `.env` variable is needed. Existing keys were not changed or printed.

The active application no longer calls Google's Geolocation API. Places API and legacy Directions API are also unnecessary for this version. Earlier setup advice to enable Geolocation/legacy Directions is superseded by this section. Browser location itself needs HTTPS (or localhost), OS/browser permission, and available device positioning. On a phone opening an HTTP LAN address, use HTTPS or enter an address instead.

### Validation record

- Backend regression suite: **81 tests passed**, including request field masks, zero coordinates, all four mode mappings, text/transit instructions, malformed provider data, no-route results, denied keys, timeouts and retired server geolocation. Provider calls in the regression tests are mocked; authentication and owner checks remain enabled through existing fixtures.
- Backend Ruff lint and format checks passed.
- Initial live verification returned HTTP 403 with **`API_KEY_SERVICE_BLOCKED`**. After the user updated Google Cloud configuration, a live walking-route request through the actual backend adapter **passed** on 22 September 2026: public Singapore test coordinates produced a 632-metre route, five instructions and an encoded polyline. This verifies the configured backend key and Routes response contract for this sample; it does not verify all travel modes, browser rendering, device permissions or the full authenticated application. Neither keys nor raw provider error bodies were logged.
- Frontend: **7 suites / 29 tests passed**. New coverage includes permission denial/unavailable/timeout, secure-context requirements, zero coordinates, manual origin and history routing, mode changes, old-response suppression, polyline cleanup, map/provider failure recovery and concurrent/retried SDK loading. SDK/provider behavior is mocked in these tests; real mobile permission behavior remains unverified.
- Production build passed. The active map page has no lint warnings; existing warnings remain in checklist, comments, forums and the CRA toolchain. Output main JavaScript is 136.78 kB gzip and CSS 4.65 kB gzip; these are build sizes, not latency measurements.

Rollout: deploy frontend and backend together, restart local servers after any environment changes, and rebuild deployed frontend assets. The `/get-directions` response preserves the `directions` list and adds encoded polyline, distance, duration, warnings and description. Old experimental map files remain outside the active route tree. Production still needs provider quotas/rate limits, real mobile permission testing and checks after the Cloud configuration change.
