# eCycle

React + FastAPI + PostgreSQL application for repair and recycling discovery in Singapore.

Interview preparation: [codebase study guide, API inventory and system-design questions](docs/eCycle_SWE_INTERVIEW_GUIDE.md).

Start here: [complete setup, Render deployment and database recovery](docs/SETUP_AND_RECOVERY.md).
Includes creating a replacement Supabase project, repopulating an empty database,
and updating both local and Render environment variables.

Read [the architecture, upgrade plan, Supabase setup, and implementation log](docs/UPGRADE_PLAN.md).
Original requirements: [SRS](docs/SRS_Template.docx).

Google Maps setup and current location/routing repair: [location and directions guide](docs/LOCATION_DIRECTIONS_UPGRADE.md).
The browser key needs Maps JavaScript API; the backend key needs Geocoding API
and Routes API. Enable Routes API in the project **and** allow it on the backend
key. Browser geolocation needs HTTPS or localhost and the user's permission.

Current priority: [authentication upgrade, tradeoffs and Supabase setup checklist](docs/AUTH_UPGRADE.md).
Email-based Supabase Auth has replaced legacy username/password login. Configure
Auth and sign up through the application, or explicitly link a verified legacy
account using the Auth guide. The configured Supabase database was populated on
September 22, 2026, and its identity/RLS migration is applied. See the
[database recovery record](docs/DATABASE_RESTORE.md) for counts and checks.
Full browser authentication and deployment setup remain unverified.

## Local development (PowerShell, from repository root)

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/ecycle-app/.env.example frontend/ecycle-app/.env
```

Copy examples only when `.env` does not already exist; preserve your existing values.
Edit those files first. `DATABASE_URL` belongs only in `backend/.env`.
Prepare a local PostgreSQL database or reconnect to Supabase using the guide.
The checked-in `.sql` backups are custom archives requiring `pg_restore`.

Start the API:

```powershell
.venv\Scripts\python backend/app.py
```

In a second terminal:

```powershell
cd frontend/ecycle-app
npm ci
npm start
```

Open `http://localhost:3000`. API liveness is `http://localhost:5000/health`.
Interactive API docs: `http://localhost:5000/docs`; schema: `/openapi.json`.
The API uses Uvicorn, with one SQLAlchemy session per request.
This endpoint does not check database readiness. Google Maps needs the separate
browser/server keys described in the guide.

## Checks

```powershell
.venv\Scripts\python -m pytest backend/tests -q
.venv\Scripts\python -m ruff check backend
.venv\Scripts\python -m ruff format --check backend
cd frontend/ecycle-app
npm test -- --watchAll=false --runInBand
npm run build
```

Use this as a local development project until the security and dependency
release blockers listed in the upgrade plan are resolved. Historical frontend
README/launch scripts and Firebase workflows do not describe the current setup.
