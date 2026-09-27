# eCycle: setup, deployment and database recovery

Last checked: 22 September 2026. Run local commands in **PowerShell**. Replace placeholders before using them. This guide contains no real credentials.

## 1. Know what runs where

| Component | Host | Source/configuration |
| --- | --- | --- |
| React website | Render Static Site | `frontend/ecycle-app`; public `REACT_APP_*` build variables |
| FastAPI backend | Render Docker Web Service | `backend`; private runtime environment variables |
| PostgreSQL and email authentication | Supabase project | Backend database URI; same Supabase project URL/key in both services |
| Map display | Google Maps JavaScript API | Browser Google key |
| Address lookup and directions | Google Geocoding API and Routes API | Backend Google key |

Your Render, GitHub and Supabase account emails may differ. Their account passwords are not application environment variables. The **Supabase database password** is a separate password used inside `DATABASE_URL`.

The previous website address was `https://ecycle-1.onrender.com`. A new Render service/account does not automatically acquire that address. Use the URLs actually assigned to your services throughout this guide.

## 2. If the database seems dead, diagnose before rebuilding

**The 30-day rule is for Render Free Postgres. We use Supabase PostgreSQL.** Render's free database expires after 30 days, followed by a 14-day opportunity to upgrade before deletion. Its free web services instead sleep after 15 minutes idle and wake on requests; waking can take about a minute. A sleeping backend is not a deleted database. [Render free-service rules](https://render.com/docs/free)

Supabase's current documentation says Free projects with low activity over seven days can pause. It currently describes a one-year resume window after pausing; older advice may mention 90 days. Check the dashboard and current policy when recovering. [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

| Situation | Action |
| --- | --- |
| Supabase says paused | Dashboard → organization → project → **Resume project**. Wait for it to become ready, then check the database. Do not import the archive. |
| Backend is waking up | Open its `/health` URL, wait, then retry the app. |
| Database password or key changed | Update the affected local and Render variables; see section 10. |
| Tables/data still exist | Preserve them. Do not run the empty-database importer. Investigate credentials, network, project status and logs. |
| Old project cannot be recovered, but a recent backup exists | Prefer restoring that backup using Supabase's supported recovery process; see section 12. |
| New empty project, and only the repository archive exists | Follow sections 3–6 to recreate the baseline data, then update both Render services. |

Resuming the same project normally preserves its data and configuration. Verify the current Connect/API settings; change credentials only if they changed. **Creating a different project changes its URL, keys and database connection details.**

## 3. Prepare your computer and checkout

Install Git, Python, Node.js/npm and Docker Desktop. Start Docker Desktop with Linux containers enabled. Docker is needed for isolated archive inspection/recovery, not normal local frontend/backend development. The backend Dockerfile currently uses Python 3.11.

For a new checkout:

```powershell
git clone https://github.com/CobaltConcrete/eCycle.git
Set-Location eCycle
```

For the existing checkout:

```powershell
Set-Location C:\Users\ganqi\Projects\eCycle
git status
```

Use the latest reviewed code containing `backend/populate_database.py`. Preserve any uncommitted work before pulling updates.

```powershell
# Create the environment only if missing.
if (-not (Test-Path .venv/Scripts/python.exe)) { python -m venv .venv }
.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
npm.cmd --prefix frontend/ecycle-app ci

# Never overwrite existing credentials with examples.
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
if (-not (Test-Path frontend/ecycle-app/.env)) { Copy-Item frontend/ecycle-app/.env.example frontend/ecycle-app/.env }
```

Activation is optional because these commands name the virtual environment's Python directly. You do not need to change PowerShell execution policy to run them. Keep `.env` files out of Git and never paste their contents into an issue or chat.

## 4. Create a Supabase project and collect credentials

1. Open [Supabase Dashboard](https://supabase.com/dashboard). Sign in with the account you will retain access to, create/select an organization, then click **New project**.
2. Choose a project name and an appropriate region, preferably close to the backend/users. Set a strong **database password** and save it in a password manager. Wait for provisioning to finish.
3. Open the project's **Connect** dialog. Copy its **Project URL**, such as `https://PROJECT_REF.supabase.co`.
4. Open **Settings → API Keys** (also available through Connect). Copy a **publishable key**, normally beginning `sb_publishable_`. This app also supports the legacy `anon` key. Do not use `sb_secret_`, `service_role`, the JWT signing secret, or your database password as this key. [API key types](https://supabase.com/docs/guides/getting-started/api-keys)
5. In **Connect → connection string**, select **Session pooler** for an IPv4-compatible persistent backend connection. Copy the exact URI, including its username, host and port. Do not construct these from memory or use the transaction-pooler port interchangeably. Direct connections are another option where IPv6/network support permits. [Supabase connection options](https://supabase.com/docs/guides/database/connecting-to-postgres)
6. Replace the database-password placeholder in the URI. Percent-encode special characters in the password component only: for example `@` becomes `%40`, `#` becomes `%23`, and `/` becomes `%2F`. If forgotten, reset the database password under database settings and update all clients that use it.
7. Ensure the URI includes `sslmode=require`.

A query string begins with `?`; additional parameters are separated by `&`:

```text
No query parameters:
postgresql://USER:PASSWORD@HOST:5432/postgres
becomes:
postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require

Already has a query parameter:
postgresql://USER:PASSWORD@HOST:5432/postgres?connect_timeout=10
becomes:
postgresql://USER:PASSWORD@HOST:5432/postgres?connect_timeout=10&sslmode=require
```

If `sslmode` already exists, check/update that value instead of adding a duplicate. The URI starts with `postgresql://`, not the project's `https://` API URL.

## 5. Fill in the two local environment files

Edit `backend/.env`:

```dotenv
DATABASE_URL=postgresql://EXACT_USER:ENCODED_PASSWORD@EXACT_HOST:EXACT_PORT/postgres?sslmode=require
SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=5000
GOOGLE_MAPS_API_KEY=YOUR_BACKEND_GOOGLE_KEY
```

Edit `frontend/ecycle-app/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_GOOGLE_KEY
```

Both Supabase URLs/keys must refer to the same project. The backend database URI must point to the intended application database in that project. No Supabase service-role key is required by this implementation. Preserve Google keys when replacing only Supabase.

Existing shell environment variables override `.env` through `python-dotenv`. Use a fresh terminal without stale exported `DATABASE_URL`/Supabase variables before recovery. Check the target project yourself before importing; the importer intentionally does not print credentials or connection URLs.

## 6. Populate a NEW EMPTY database from the reviewed baseline

This procedure recreates eCycle's **November 10, 2024 baseline**, not the latest state of an active website. It cannot recover later posts, newly registered users or recent settings. Do not use it if a more recent recoverable project/backup exists and you need those records.

The file `backend/_backend_data/SQL-scripts/ecycle20241110.sql` is a PostgreSQL **custom archive**, despite its `.sql` extension. Do not paste it into Supabase SQL Editor or run it with `psql -f`. Older archives and individual table scripts are unnecessary for the verified baseline. [Archive format and pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)

### 6a. Check the new target

```powershell
.venv/Scripts/python.exe backend/check_database.py
```

For a fresh empty target, expect a successful connection followed by missing application tables. A connection failure must be fixed before continuing. In Supabase's Table Editor, confirm the `public` schema has no application tables. Supabase-managed `auth` and `storage` schemas are normal and must remain intact.

### 6b. Restore the archive into an isolated local container

Run from the repository root. Choose a different container name if this one already exists; do not delete an unrelated container.

```powershell
$backupDirectory = (Resolve-Path backend/_backend_data/SQL-scripts).Path
docker run --detach --name ecycle-restore-review --network none --mount "type=bind,source=$backupDirectory,target=/backup,readonly" --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17
if ($LASTEXITCODE -ne 0) { throw 'Container creation failed; stop here.' }

docker exec ecycle-restore-review pg_isready -U postgres
```

Wait and repeat `pg_isready` until it reports **accepting connections**. This container has no network or published ports; the local trust setting must not be reused for an exposed database.

Inspect metadata/schema, then restore locally:

```powershell
docker exec ecycle-restore-review pg_restore --list /backup/ecycle20241110.sql
docker exec ecycle-restore-review pg_restore --schema-only --no-owner --no-privileges --file=- /backup/ecycle20241110.sql
docker exec ecycle-restore-review pg_restore -U postgres -d postgres --no-owner --no-privileges --single-transaction /backup/ecycle20241110.sql
if ($LASTEXITCODE -ne 0) { throw 'Local archive restore failed; do not import.' }
```

This exact archive was reviewed and restored successfully on September 22, 2026. SHA-256:

```text
F9061A9DCD6F04C688B5B5BEE1EFBCCEE438E80140F1909B0F156F74454A0B23
```

Check with `(Get-FileHash backend/_backend_data/SQL-scripts/ecycle20241110.sql -Algorithm SHA256).Hash`. A different archive needs its own review; the baseline importer is not a generic Supabase backup restorer.

### 6c. Preview, then import into the configured Supabase database

```powershell
.venv/Scripts/python.exe backend/populate_database.py --container ecycle-restore-review
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; stop here.' }
```

Expect source counts and **Preview passed; no target changes**. The tool validates columns, keys and relationships and refuses a target with any existing public tables. Once the preview passes and you have confirmed the target is your new empty project:

```powershell
.venv/Scripts/python.exe backend/populate_database.py --container ecycle-restore-review --apply
if ($LASTEXITCODE -ne 0) { throw 'Import failed; inspect before retrying.' }
.venv/Scripts/python.exe backend/check_database.py
```

The importer creates the current nine-table schema, imports the eight historical tables, checks every copied value, resets ID sequences and applies the identity/RLS migration **inside one transaction**. Do not separately run old create-table scripts or `001_auth_identity.sql` first. On a reported error, stop; inspect the target before retrying, especially if connectivity was lost around commit.

Expected baseline counts:

| Table | Rows |
| --- | ---: |
| usertable | 740 |
| shoptable | 718 |
| checklistoptiontable | 9 |
| userchecklisttable | 3,801 |
| forumtable | 8 |
| commenttable | 35 |
| userhistorytable | 11 |
| reporttable | 7 |
| authidentity | 0 |

`authidentity = 0` is expected: the archive has no Supabase login identities. All application table access goes through FastAPI; do not disable RLS just to make browser Data API requests work.

When finished, remove only your temporary container and its anonymous volume:

```powershell
docker rm --force --volumes ecycle-restore-review
```

Do not put the restore/import command in Render's startup or pre-deploy command. The importer is intentionally a one-time empty-database operation. Detailed original verification: [DATABASE_RESTORE.md](DATABASE_RESTORE.md).

## 7. Configure authentication and Google Maps

For Google, GitHub and Microsoft login, follow [OAuth provider setup](OAUTH_SETUP.md) as well. These options avoid eCycle confirmation-email delivery for social sign-in, but each provider must be configured in Supabase. Their client secrets do not belong in either app's `.env`.

### Troubleshooting: missing confirmation email or reset opens localhost

These are separate checks. The current signup form sends `emailRedirectTo: window.location.origin + '/'`; recovery sends `redirectTo: window.location.origin + '/update-password'`. Opening the deployed site should request its deployed origin. Opening a local development site intentionally requests localhost. Source inspection does not prove which frontend build is deployed.

1. Open [Supabase projects](https://supabase.com/dashboard), select the project used by the frontend, then **Authentication → URL Configuration**. Set **Site URL** to the actual deployed frontend HTTPS origin, not the API service and not localhost. Add exact frontend root and `/update-password` URLs to **Redirect URLs**, as shown below. Keep local entries only for local development. A reset landing on localhost may indicate a fallback Site URL, an unallowlisted requested redirect, an old email link or a custom template with a hard-coded address. [Redirect troubleshooting](https://supabase.com/docs/guides/troubleshooting/why-am-i-being-redirected-to-the-wrong-url-when-using-auth-redirectto-option-_vqIeO)
2. Check **Authentication → Email Templates** (or the Emails section). Confirmation/recovery links must perform Auth verification; restore the standard template if a custom one points directly to localhost or to a plain application URL without verification. The standard `{{ .ConfirmationURL }}` includes the verification flow. Do not share emailed token links in logs or support messages.
3. Request a **new** reset email from the deployed frontend after saving settings. Old links do not get rewritten. The deployed `/update-password` route must load the React app; ensure Render's Static Site rewrite `/*` → `/index.html` is configured. If already on localhost, browser connection refusal means no local server is listening; it does not indicate a database password error.
4. For missing signup email, inspect **Authentication → Users** for that email and **Logs → Auth** around the request time. Distinguish unauthorized recipient, rate limit, SMTP failure, already-existing account and successful submission. A neutral success screen does not prove email delivery. Check the recipient's spam folder and the sender provider's delivery logs as well.
5. Supabase's default sender is restricted to project-team recipients and currently has a very low sending limit. To accept public users, configure **custom SMTP** in Authentication email/SMTP settings: provider host, port, username, password and verified sender address/name. Complete the provider's sender/domain verification. SMTP credentials go in Supabase settings, not frontend `.env`. Do not invite application users into your Supabase organization to bypass this restriction. [SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp)
6. Keep email confirmation enabled. After fixing delivery, resend confirmation for a pending user using the dashboard's user action if available. Do not delete existing accounts/data as the first troubleshooting step. Test signup and recovery separately, using newly issued links.

These dashboard-only corrections do not require new API keys or a Render rebuild when the frontend already points to the correct Supabase project. A wrong `REACT_APP_SUPABASE_URL` or publishable key requires correcting the Static Site environment and rebuilding; the backend must use the corresponding project too. Do not infer the production frontend URL from an old backend Render URL.

In the new Supabase project:

1. **Authentication → Sign In / Providers → Email**: enable email/password, require confirmation and set a minimum password length of at least 12. Labels may vary with dashboard updates.
2. **Authentication → URL Configuration**: set Site URL to your actual frontend HTTPS origin. For local-only setup, use `http://localhost:3000` until deployment.
3. Add exact redirect URLs for the frontend root and password update page, plus local equivalents:

```text
https://YOUR-FRONTEND.onrender.com/
https://YOUR-FRONTEND.onrender.com/update-password
http://localhost:3000/
http://localhost:3000/update-password
```

Add `127.0.0.1` equivalents if using that hostname. Configure custom SMTP for registration beyond the default sender's restrictions, and test actual confirmation/recovery delivery. These are project settings and must be recreated in a new project. [Redirects](https://supabase.com/docs/guides/auth/redirect-urls), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Sign up through eCycle, confirm the email and create a profile with a new username. Historical `usertable` rows are not Supabase logins. To reclaim an old username, shop or admin account, sign up/confirm and **stop at Complete your profile**; use the verified-ownership procedure and SQL in [AUTH_UPGRADE.md](AUTH_UPGRADE.md#preserve-and-link-an-existing-username-only-account). Recreated Auth users get new UUIDs. Never attach privileges automatically by username or blindly reuse old identity mappings.

For Google, open [Cloud Console](https://console.cloud.google.com/) and select the project that owns the keys. Ensure billing is configured, enable the APIs, then restrict each key in [Credentials](https://console.cloud.google.com/apis/credentials):

| Key | Enable AND allow under API restrictions | Application restriction |
| --- | --- | --- |
| Browser | [Maps JavaScript API](https://console.cloud.google.com/apis/library/maps-backend.googleapis.com) | Websites: `http://localhost:3000/*`, any other local origin used, and `https://YOUR-FRONTEND.onrender.com/*` |
| Backend | [Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com) and [Routes API](https://console.cloud.google.com/apis/library/routes.googleapis.com) | Server egress IPs when available; allow Render's applicable outbound addresses. Do not use website-referrer restrictions for this key. |

Google Geolocation API, Places API and legacy Directions API are not required by the current app. Device location uses browser geolocation, which needs HTTPS or localhost and user permission. Supabase replacement alone does not require new Google keys.

## 8. Connect a private GitHub repo to a separate Render account

1. Sign into [Render](https://dashboard.render.com/) with your burner Google/email account.
2. In the same browser/profile, sign into GitHub with the main account that owns `CobaltConcrete/eCycle`.
3. Render → **Account Settings → Account Security → Git Deployment Credentials → Add credential → GitHub**. Complete the GitHub authorization screen. If the main GitHub username is already listed, this part is done.
4. Open [Render's GitHub App installation](https://github.com/apps/render/installations/new), select the owning account → **Only select repositories → eCycle → Install/Save**.
5. Refresh Render's new-service repository list. For an existing service, verify its deployment Git credentials in Settings.

GitHub deployment credentials can be separate from the Google/email login used for Render. If you use GitHub for both login and deployment, the GitHub identity must match; add another working login method before disconnecting an unwanted GitHub login. [Render Git setup](https://render.com/docs/git-provider), [account rules](https://render.com/docs/login-settings)

Push reviewed application changes to the selected branch before deploying. Keep both `.env` files excluded. Render clones GitHub, not your computer's working directory.

## 9. Deploy both Render services

### Backend: Docker Web Service

**Verified deployment mismatch, 27 September 2026:** `https://ecycle-backend.onrender.com` returned 404 HTML for `OPTIONS /auth/me`, `GET /auth/me` and `GET /health`, with `x-render-origin-server: Werkzeug/3.1.5 Python/3.11.14`. The preflight already included `Access-Control-Allow-Origin: https://ecycle-1.onrender.com`; its non-success status caused the browser's CORS failure. This is evidence of a legacy/wrong backend deployment, not a reason to allow every origin. GitHub `main` was verified at `6bb856f`, which includes FastAPI and `/auth/me`. A failed newer deployment may leave the old service live; inspect Render Events/build logs and the deployed commit, repository, branch and command.

For these URLs, use backend `CORS_ORIGINS=https://ecycle-1.onrender.com` and frontend `REACT_APP_API_URL=https://ecycle-backend.onrender.com`. Use the Docker settings below. If the existing backend instead uses Render's native Python runtime, keep that runtime and set Root Directory `backend`, Build Command `pip install -r requirements.txt`, Start Command `python app.py`, and Health Check Path `/health`. `backend/app.py` starts Uvicorn itself and reads `PORT`. Do not start the archived Flask app, `flask run`, or a WSGI-only Gunicorn command for this ASGI application. Select the correct repository/branch, remove obsolete command overrides, then manually deploy the latest commit. Build failure is not successful deployment; resolve the logged failure before assuming the old process was replaced.

After deployment, verify `/health` returns `{"status":"ok","service":"ecycle-api"}`, `/docs` serves the FastAPI documentation, and `/auth/me` without credentials returns 401 rather than 404. An OPTIONS request to `/auth/me` with origin `https://ecycle-1.onrender.com`, requested method GET and requested header authorization must return 200 and that allowed origin. Local isolated checks passed for these three status expectations; the live backend still required correction at the time of this investigation. Health checks do not establish database/Auth readiness.

Create **New → Web Service**, using `CobaltConcrete/eCycle`:

| Setting | Value |
| --- | --- |
| Name | An available name, e.g. `ecycle-api` |
| Branch | `main` (or the reviewed deployment branch) |
| Language/runtime | Docker |
| Region | Close to the Supabase project |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context Directory | `.` |
| Docker Command | Leave blank; uses `python app.py` from the Dockerfile |
| Pre-Deploy Command | Leave blank |
| Health Check Path | `/health` |
| Persistent Disk | None required |

The Docker paths are relative to Root Directory, so do not enter `backend/Dockerfile` when Root Directory is already `backend`. Render builds from the Dockerfile; no separate pip build command is needed. [Root-relative settings](https://render.com/docs/monorepo-support), [Docker deployment](https://render.com/docs/docker)

Under **Environment**, set:

```dotenv
DATABASE_URL=YOUR_COMPLETE_NEW_SUPABASE_DATABASE_URI_WITH_SSL
SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_NEW_PROJECT_PUBLISHABLE_KEY
GOOGLE_MAPS_API_KEY=YOUR_BACKEND_GOOGLE_KEY
CORS_ORIGINS=https://YOUR-FRONTEND.onrender.com
```

Use bare values in Render's key/value fields, without wrapping quotes. No manually configured `PORT` is needed; `app.py` reads Render's environment and listens on `0.0.0.0`. Do not upload a secret `.env` into the image. The backend's `.dockerignore` excludes it.

Deploy and save the actual backend URL. `/health` and `/docs` should respond. **Health is liveness only**, not proof of database readiness.

### Frontend: Static Site

Create **New → Static Site**, using the same repository:

| Setting | Value |
| --- | --- |
| Name | An available frontend name |
| Branch | Same reviewed branch |
| Root Directory | `frontend/ecycle-app` |
| Build Command | `npm ci && CI=false npm run build` |
| Publish Directory | `build` |
| Start command / Docker settings / Health path | Not applicable |

`CI=false` is a temporary accommodation for existing lint warnings in legacy discussion pages. It does not bypass compilation errors. The frontend is still CRA; Vite migration is planned separately.

Under **Environment**, set:

```dotenv
REACT_APP_API_URL=https://YOUR-ACTUAL-BACKEND.onrender.com
REACT_APP_SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=YOUR_NEW_PROJECT_PUBLISHABLE_KEY
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_BROWSER_GOOGLE_KEY
```

The API URL is the backend origin, without `/docs`, `/health` or a trailing slash. Never put database passwords, `DATABASE_URL`, Supabase secret/service-role keys or the backend Google key in frontend variables.

Under **Redirects/Rewrites**, add source `/*`, destination `/index.html`, action **Rewrite**. This enables direct visits to routes such as `/update-password`. [Render React setup](https://render.com/docs/deploy-create-react-app)

After Render assigns the frontend URL, put that same origin into backend `CORS_ORIGINS`, Supabase Site URL/redirects and the Google browser key's referrer restrictions. Redeploy the backend after the CORS change. An origin has no path or trailing slash; Google referrer entries additionally use `/*`.

## 10. Replacing Supabase: exactly what to change in Render

Local `.env` edits do **not** update Render. A Git push does **not** copy ignored `.env` files there.

| Location | Replace after creating a new Supabase project |
| --- | --- |
| Local `backend/.env` | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| Local frontend `.env` | `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY` |
| Render backend → Environment | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |
| Render Static Site → Environment | `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY` |
| New Supabase project | Email settings, SMTP if used, Site URL and redirects; restore/create users and verified mappings as appropriate |

Keep `REACT_APP_API_URL`, `CORS_ORIGINS` and Google keys unchanged if the Render service URLs and Google project remain the same. If service URLs change too, update them as explained in section 9.

Exact cutover sequence:

1. Preserve access to the old project and latest backup while preparing the replacement. Expect interruption during the frontend/backend cutover; this is not an atomic zero-downtime migration.
2. Populate and verify the new database locally. Configure Auth/redirects in the new project.
3. Render → backend service → **Environment → Edit** → replace its three Supabase variables → save with deployment. Check deployment logs and `/health`.
4. Render → Static Site → **Environment → Edit** → replace its two Supabase variables → choose **Save, rebuild, and deploy**. If changes were saved only, trigger a new build/deploy manually.
5. Restart local API/frontend processes after local `.env` changes. For React on Render, restarting or serving an old build is insufficient: the new URL/key must be embedded in a **new build**. [Render environment-variable actions](https://render.com/docs/configure-environment-variables)
6. Use a private browser window or sign out of the old session and reload. Sign into the new project's Auth account. Old project access tokens cannot authenticate against the replacement project.
7. Complete the checks in section 11 before retiring the old project/backup.

Changing only the database password in the SAME project usually needs only `DATABASE_URL` updated locally and on the Render backend, followed by backend restart/deploy. It does not by itself change the project's publishable key or frontend Auth URL.

## 11. Start locally and verify end to end

From repository root, terminal one:

```powershell
.venv/Scripts/python.exe backend/check_database.py
.venv/Scripts/python.exe backend/app.py
```

Terminal two:

```powershell
Set-Location C:\Users\ganqi\Projects\eCycle\frontend\ecycle-app
npm.cmd start
```

Open `http://localhost:3000`; API docs are at `http://localhost:5000/docs`. For production, perform the same user checks at your actual frontend URL:

- Sign up, receive/confirm email, complete a profile and sign in. Test password recovery through `/update-password`.
- Open the checklist: nine baseline categories should load. Save a selection.
- Pick repair/recycling/disposal, enter an address or allow device location, and load nearby places.
- Select a place; check directions and switch travel modes. Some destinations/modes legitimately have no route.
- Open its forum. Verify the signed-in user's intended permissions and history flow.
- Check deployed commit IDs in Render against the commit you intended to deploy.

Common failures:

| Symptom | Check |
| --- | --- |
| Missing tables | Confirm correct target/project and successful import; do not blindly rerun against populated tables. |
| Import refused / generic import failure | Confirm the target is empty and source preview passes. The importer intentionally suppresses raw SQL/row contents; investigate safely rather than deleting tables. |
| Database connection failure | Project status, exact URI/password encoding, TLS, session-pooler host/port, network restrictions and stale shell variables. |
| Browser CORS error | Backend `CORS_ORIGINS` matches frontend origin exactly; backend deployment succeeded. |
| Login works but profile missing | Complete a new profile or follow verified legacy-account linking. An empty `authidentity` after baseline restore is normal. |
| Existing username unavailable | Historical account exists; verify and link ownership instead of creating a duplicate. |
| Invalid token after project replacement | Frontend/backend Supabase project mismatch, stale build or old browser session. |
| Confirmation email missing | New project's SMTP/default sender restrictions, recipient, confirmation settings and delivery logs. |
| Map authorization or Routes 403 | Correct Google project, billing, enabled APIs AND each key's API/application restrictions. |
| Direct `/checklist` or recovery link returns 404 | Static Site needs `/*` → `/index.html` rewrite. |
| Old UI / old Supabase requests | Commit pushed, correct branch deployed, Static Site rebuilt with new variables; reload browser. |

## 12. Preserve newer data before another recovery

The repository's 2024 archive is a fallback seed, **not an ongoing backup**. A fresh baseline loses subsequent user content and does not restore Supabase Auth users, their sessions or project configuration.

For a live project, keep recent off-site backups and a private record of deployment configuration. Supabase recommends regular CLI exports for Free projects. Use its [backup documentation](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) for the current supported process. Validate recovery in a separate project. Do not substitute `populate_database.py` for that full-project procedure: it deliberately handles only eight legacy tables and creates an empty identity table.

A recovery plan must cover application schema/data and `authidentity`, Supabase Auth identities/UUID preservation or verified relinking, and separate project settings such as SMTP/redirects/keys. If Storage is added later, back up its actual files separately; database metadata is not the object contents. Current legacy comment images are stored in application rows.

Store exports outside Git in protected storage; they can contain personal data and password hashes. Keep access to the email owning the cloud account so pause/expiry notices and account recovery work. If you no longer have the new data or a recoverable backup, there is no command that can reconstruct it from the old archive.

## 13. Why this runbook and what was verified

1. **Old approach insufficient:** setup answers were spread across chat and several guides; it was easy to confuse Render expiry with Supabase pausing, or change local credentials without rebuilding Render.
2. **Benefit:** one ordered procedure covers first setup, safe baseline recovery, Auth ownership and the exact local/production variable changes.
3. **Limitations:** provider UI/policies can change; this is a manual cutover and the baseline is historical. It is not automated disaster recovery or proof a new deployment succeeded.
4. **Alternatives:** blindly restoring into the active database risks overwriting current data. Recreating cloud resources with infrastructure-as-code could improve repeatability later but adds state/secrets management and does not solve Auth/data recovery by itself. Resume the existing project or restore a current backup whenever possible.

Validation for this documentation change: checked against checked-in env examples, Dockerfile, startup code, importer, earlier recovery results and official provider documentation. No new project was created, no database was written, and no Render settings were changed while writing this guide. September 22 baseline import counts are historical evidence, not a promise that every future restore will succeed.
