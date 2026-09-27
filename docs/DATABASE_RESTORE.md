# Database population — 22 September 2026

For first setup or a replacement Supabase project, follow the ordered
[setup and recovery runbook](SETUP_AND_RECOVERY.md), including Render environment
changes. The counts below record the September 22 baseline import, not current
live counts. Resume a paused project before considering a baseline rebuild.

## Learning questions, before implementation

1. **Why was the previous solution insufficient?** The configured Supabase PostgreSQL database is reachable, but its public schema has no tables. Files in the repository are backups, not a populated database. Historical creation scripts also disagree with the current models: history lacks its composite key and forum references the user table instead of the shop table.
2. **What does this change bring?** Restore the November 10, 2024 archive into an isolated PostgreSQL 17 container, then transfer only the eight approved application tables into the current SQLAlchemy schema. Preserve IDs and data, reset generated IDs, and enable the Auth migration's RLS/access restrictions before committing. The importer defaults to a read-only preview and refuses any existing public tables.
3. **What could it lack?** These are historical records, not verified current opening hours or facility information. Legacy accounts are not Supabase Auth accounts. This one-time importer is deliberately unsuitable for merging into an existing database; future schema changes need migrations. Base64 images and string timestamps remain storage limitations. No performance improvement is claimed.
4. **Alternatives and tradeoffs:** A direct archive restore is simpler but imports obsolete constraints and lacks the current identity protections. Individual SQL/CSV scripts reconstruct less information and use outdated application interfaces. Creating current tables and transferring validated records takes more care but makes the resulting schema match the running application. SQLAlchemy is already in the stack; adding an ETL service for this small recovery is unnecessary.

## Source and procedure

Selected `backend/_backend_data/SQL-scripts/ecycle20241110.sql`: a custom-format PostgreSQL 15.2 archive dated November 10, 2024. Its table of contents and schema were inspected before restoring into a temporary container with no network or published ports. The complete eight-table archive restored successfully, so older backups and CSV scripts were unnecessary. PostgreSQL documents archive inspection and restoration in [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Local checks found no duplicate history keys, missing shop users, missing forum shops, null report scores, or category names exceeding the current limit. No account ownership is inferred from names. No credentials or row contents are logged.

Archive SHA-256: `F9061A9DCD6F04C688B5B5BEE1EFBCCEE438E80140F1909B0F156F74454A0B23`.

## Implemented and verified

The configured Supabase PostgreSQL 17 database is now populated. `backend/populate_database.py` validates source columns, required values, lengths, primary keys and foreign keys, creates the current schema, transfers data and compares every stored value with the source. It inserts comment reply links after all comments exist, resets serial sequences and applies `001_auth_identity.sql` within the same transaction. It never executes archive SQL against Supabase or modifies `auth.users`. No records were discarded or normalized.

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

The current schema adds the history composite primary key, validates shop ownership and references actual shops from forums. Other constraints follow the current ORM, rather than copying historical cascade behavior or the category-name unique constraint absent from that ORM. Future changes should use explicit migrations.

Live verification after commit:

- All nine tables have RLS enabled; neither `anon` nor `authenticated` has effective SELECT/INSERT/UPDATE/DELETE table privileges.
- No unvalidated constraints; all five serial sequences equal their tables' maximum IDs with `is_called=true`.
- No invalid coordinate ranges. The backend nearby-location function returned five results for each of `general`, `repair` and `dispose`, using a historical resident's preferences. This was a read-only function check, not an authenticated browser test.
- Full-value comparisons passed for all eight imported tables, including image contents. Independent post-commit row counts matched.
- Backend tests: **85 passed**, including four importer safety tests; Ruff lint and formatting pass. An existing Starlette/AnyIO deprecation warning remains.
- During implementation, the migration's `%I` SQL format markers exposed a driver execution issue. The transaction rolled back with no partial tables; compiling the statement through SQLAlchemy corrected it before the successful import.

## What you need to do

**No database credential changes or manual import are needed for the current configured project.** Keep using the existing backend `.env`. Supabase Dashboard → your project → Database → Tables (or Table Editor) → `public` shows the restored tables.

The 740 historical user records include facility/shop records; they are not 740 ready-to-use Supabase logins. `authidentity` is intentionally empty. Sign up with a new username through the app, confirm the email if required, and complete your profile. To recover an existing username or admin/shop account, follow the verified-ownership linking procedure in [AUTH_UPGRADE.md](AUTH_UPGRADE.md); do not automatically attach accounts by username.

For a read-only count check, run from the repository root:

```powershell
.venv\Scripts\python backend/check_database.py
```

## Repeating on a different empty database

Only for deliberate recovery into an empty target: configure that target in `backend/.env`, inspect the archive's table of contents and schema, then restore it into an isolated temporary PostgreSQL 17 container. Example from the repository root with Docker running:

```powershell
$backupDirectory = (Resolve-Path backend/_backend_data/SQL-scripts).Path
docker run --detach --name ecycle-restore-review --network none --mount "type=bind,source=$backupDirectory,target=/backup,readonly" --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17
# Wait for pg_isready to report that the isolated database accepts connections.
docker exec ecycle-restore-review pg_isready -U postgres
docker exec ecycle-restore-review pg_restore --list /backup/ecycle20241110.sql
docker exec ecycle-restore-review pg_restore --schema-only --no-owner --no-privileges --file=- /backup/ecycle20241110.sql
# After inspection:
docker exec ecycle-restore-review pg_restore -U postgres -d postgres --no-owner --no-privileges --single-transaction /backup/ecycle20241110.sql
.venv\Scripts\python backend/populate_database.py --container ecycle-restore-review
.venv\Scripts\python backend/populate_database.py --container ecycle-restore-review --apply
.venv\Scripts\python backend/check_database.py
# Remove only this temporary review container and its anonymous data volume.
docker rm --force --volumes ecycle-restore-review
```

The importer refuses an already populated public schema, including today's restored project. It is not a merge or overwrite command. An import error rolls back the newly created schema and data; after a successful commit, do not rerun or drop tables to undo it. Use a separately reviewed recovery plan if the target later contains new application activity. Local trust authentication above is confined to the container with no network or exposed ports.
