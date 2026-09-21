# Priority 1: authentication and API authorization

Decision recorded before implementation, 21 September 2026. Vite/TypeScript and storage changes remain separate future iterations.

## 1. Why was the previous solution not good enough?

Login returned the stored bcrypt password hash. The browser saved it as a reusable credential, with no expiration. Most API mutations trusted request user IDs without checking who sent them. Calling the API directly bypassed page guards. A password hash should never be an API credential. FastAPI validation checks input shape; it does not establish identity or ownership.

## 2. What does this change bring?

Use Supabase Auth for email/password authentication, confirmation, password recovery and refreshable sessions. One frontend API client attaches access tokens. FastAPI validates tokens through the configured project's Auth `/user` endpoint, then resolves the UUID to an integer application user through a unique identity mapping. Roles come from our database, never editable Auth user metadata. Business endpoints require authentication; private data and mutations require ownership, with explicitly limited administrator moderation permissions.

Keep existing integer keys and account data. A separate mapping table avoids rewriting every foreign key. New accounts can choose resident or shop, never administrator. Existing accounts require an operator to verify ownership before linking. Retire old login/register endpoints instead of leaving an insecure fallback.

## 3. What could the new solution lack?

- Online verification adds an Auth network round trip per API request and fails closed during an Auth outage. No performance improvement is claimed. Dependency caching is per request, not across requests.
- Browser-managed sessions are accessible to JavaScript: XSS can still steal tokens. Supabase sign-out revokes refresh capability, but issued access tokens can remain valid until expiry. A disabled local identity blocks subsequent API requests immediately. This is not equivalent to HttpOnly cookies.
- Provider dependence, quotas, cost and email delivery configuration remain. The API requires confirmed emails. Production needs SMTP and tested confirmation/recovery redirects.
- FastAPI permissions do not protect Supabase's direct Data API. The migration locks application tables against `anon`/`authenticated` access and enables RLS without browser policies. The backend needs a trusted database role capable of accessing them. Never put its connection string in React.
- Username-only accounts cannot safely be linked by name alone. Preserve them until ownership is verified. Old hashes remain in the database for now but are no longer accepted by the API. This is not a completed password-data cleanup or full security audit.
- Rate limits, attachment validation and dependency remediation remain release work. Authentication does not prevent abuse by a legitimate account.

## 4. Alternatives and why not chosen now

| Alternative | Strength | Why not selected now |
| --- | --- | --- |
| Local JWT verification using cached JWKS | Avoids Auth round trips; public keys only | Requires asymmetric keys and rotation/cache handling. A good measured follow-up once the project's signing configuration is known. |
| Custom password/session service | Full control and provider independence | Adds recovery, confirmation, refresh/revocation and abuse controls without a product benefit. |
| HttpOnly cookie backend-for-frontend | Reduces JavaScript access to credentials | Strong alternative for higher-risk systems; adds server-side sessions, CSRF protection and cross-origin deployment design. Browser storage is not the safest possible choice. |
| Auth0 / Clerk / Cognito | Mature managed identity options | Viable for enterprise identity or AWS-specific needs. Another provider currently adds configuration while Supabase can serve the existing PostgreSQL deployment. |
| Roles in editable user metadata | Convenient reads | Users can edit metadata; it is not an authorization source. Database roles also avoid stale role claims. |
| Replace integer user IDs with UUIDs everywhere | One identifier | Requires migrating every existing foreign key. A unique mapping preserves history with a smaller migration. |

## Interview explanation

“I chose managed identity because recovery and session security involve more than checking a password. FastAPI still owns authorization: a valid token establishes identity, not permission to edit another user's data. I preserved integer keys using a unique UUID mapping. Online verification gives compatibility and simplicity at the cost of latency and availability. At higher traffic I would benchmark cached JWKS verification and plan rotation. Browser sessions still carry XSS risk, so HttpOnly sessions are an explicit alternative.”

Sources: [Supabase sessions](https://supabase.com/docs/reference/javascript/auth), [validated user lookup](https://supabase.com/docs/reference/javascript/auth-getuser), [JWT verification](https://supabase.com/docs/guides/auth/jwts), [signing keys](https://supabase.com/docs/guides/auth/signing-keys).

## Implementation and setup

Implemented locally: Supabase JS session handling; email signup/sign-in/confirmation and recovery screens; authenticated Axios requests; centralized FastAPI identity checks; owner/role checks; atomic profile creation; an identity mapping/RLS migration; retirement of hash login and public AI classification. Existing accounts/data are preserved. **No live Supabase changes have been made.**

Legacy request ID fields remain for compatibility but must match the verified caller. `/verify` aliases now return server-derived identity and ignore old credential bodies. `/login` and `/register` return 410. Administrators may remove discussions/comments/shops and review reports, but cannot rewrite another author's text or impersonate them. Private history/checklists are owner-only. Paid geocoding routes require a signed-in application account. Health and API documentation remain public.

Points are refreshed for affected authors within discussion mutation transactions; the frontend no longer triggers global points recalculation. Shop deletion also removes associated reports. Reports use manual moderator review; broken legacy AI routes return 403 for ordinary users and 410 for administrators. Duplicate sequential reports are ignored; a database uniqueness constraint for concurrent reports remains future migration work. This iteration does not prove concurrent points updates are serializable.

### What you need to do in Supabase

1. **Open the intended project.** Use the original project if available. The repository still cannot tell us which live project hosts your data. Keep the Auth project the same in both frontend and backend.
2. **Get the project URL and publishable key.** Open the project's **Connect** dialog, or **Settings → API Keys**. Copy the URL such as `https://your-project-ref.supabase.co` and its `sb_publishable_...` key. An existing legacy `anon` key also works in this implementation. **Do not use `sb_secret_...`, `service_role`, a JWT signing secret, or the database password as the frontend key.** Publishable keys identify the application; user access tokens establish identity. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
3. **Get the database connection string.** Open **Connect → connection string**. For this persistent FastAPI server, use direct PostgreSQL if your network supports it, or the shared **session pooler** for IPv4. Copy its exact host, port and username. Replace the password placeholder with the database password, percent-encoding special characters. If forgotten, reset it in database settings and update any other deployments using it. Append `sslmode=require` (or follow the project's stricter TLS configuration). This URI is backend-only. [Connection options](https://supabase.com/docs/guides/database/connecting-to-postgres).
4. **Configure email Auth.** Under **Authentication**, enable email/password and email confirmation. Set the provider's minimum password length to at least 12 to match the UI; the browser's minimum alone is not enforcement. Configure production SMTP before opening registration broadly. Supabase's default sender is restricted and is unsuitable as a production delivery service. [Password Auth](https://supabase.com/docs/guides/auth/passwords), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
5. **Configure redirects.** In **Authentication → URL Configuration**, use `http://localhost:3000` as the development Site URL and allow `http://localhost:3000/` and `http://localhost:3000/update-password`. If using `127.0.0.1`, add those exact equivalents too. For production, change Site URL to the HTTPS app origin and add its exact root and `/update-password` URLs. Keep the default confirmation/recovery email links using `ConfirmationURL`; custom templates must preserve the requested redirect. Hosting must serve the SPA for `/update-password` on direct navigation. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
6. **Review and apply the migration.** Back up the intended database and test in staging first. Confirm the eight original tables already exist in `public`; the migration does not import data or create the original schema. In Supabase's SQL Editor, run [001_auth_identity.sql](../backend/migrations/001_auth_identity.sql) as the trusted owner. It adds `authidentity`, enables RLS and revokes browser-role access on the nine application tables. Check any existing RLS policies, views, RPCs and grants for alternate access paths. FastAPI's DB role must be the owner or have the deliberately configured privileges/RLS bypass; browser `anon`/`authenticated` roles must not be used as its DB connection. Do not apply historical dumps to an existing database as a routine setup step.
7. **Link your old account or create a new profile**, as described below. No automated linking by username is performed.

### Configure local files

**Creating a new Supabase project:** a new project starts without eCycle's eight
original application tables or shop/category data. Configure the credentials
below first, then prepare the base schema and reviewed seed data (or restore a
reviewed backup into this empty development database) before running
`001_auth_identity.sql`. That migration alone is not a fresh-database installer.
The Gmail used to own the Supabase account is separate from the database password
and from eCycle application accounts; its Gmail password never belongs in `.env`.

If the files do not exist, copy their `.env.example` templates. Otherwise edit the existing files without overwriting unrelated keys. Keep actual values out of Git and chat.

```dotenv
# backend/.env
DATABASE_URL=postgresql://EXACT_USER:ENCODED_PASSWORD@EXACT_HOST:EXACT_PORT/postgres?sslmode=require
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
PORT=5000
# Preserve your separate GOOGLE_MAPS_API_KEY if configured.
```

```dotenv
# frontend/ecycle-app/.env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
# Preserve your separately restricted REACT_APP_GOOGLE_MAPS_API_KEY.
```

No Supabase secret/service-role key or JWT signing secret is required for this implementation. The backend's database URI is the sensitive credential. Both processes need a restart after `.env` edits; deployed React assets need a rebuild. Install frontend dependencies with `npm ci`, then follow the root README startup commands.

### Preserve and link an existing username-only account

Sign up with email, confirm the email, then stop at **Complete your profile**. An operator must verify that you own the old eCycle account using a trusted process (for a personal development copy, identify your known original account). Knowing its username is insufficient proof. Find the confirmed Auth UUID in **Authentication → Users** and the old integer ID in `public.usertable`. Do not expose or copy old password hashes.

If Auth and application tables share the same Supabase database, the operator can review and replace all placeholders in this SQL:

```sql
BEGIN;
INSERT INTO public.authidentity (auth_user_id, userid, disabled)
SELECT a.id::text, u.userid, false
FROM auth.users a CROSS JOIN public.usertable u
WHERE a.id = 'REPLACE_WITH_CONFIRMED_AUTH_UUID'::uuid
  AND a.email = 'REPLACE_WITH_VERIFIED_EMAIL'
  AND a.email_confirmed_at IS NOT NULL
  AND u.userid = REPLACE_WITH_OLD_INTEGER_ID
  AND u.username = 'REPLACE_WITH_OLD_USERNAME'
RETURNING userid;
COMMIT;
```

Require exactly one returned ID. Zero means a mismatch; a unique-constraint error means one identity/account is already linked. Investigate rather than overwriting a mapping. If the application database is separate, verify the Auth account in the dashboard and perform the equivalent reviewed insert there. Existing role, points, discussions, shop, checklist and history stay attached to the original integer ID. Click **Check whether my existing account is linked** or sign in again.

New users without old accounts may create a resident or shop profile. Public profile creation cannot create an admin. To bootstrap a new moderator, an operator must review the exact verified identity and perform a scoped database role update; never expose that operation as a public signup option. Disable access immediately with a scoped `UPDATE authidentity SET disabled = true WHERE auth_user_id = 'VERIFIED_UUID'`. Unlinking or deleting a Supabase Auth user does not itself delete application data.

### Live acceptance checks still required

- Run `.venv\Scripts\python backend/check_database.py` after configuring the URI and migrating. It checks connectivity/table presence, not RLS or email delivery.
- Confirm email signup, expired/reused confirmation links, sign-in, reload/refresh, password reset and sign-out using real test accounts. Use two residents, a shop and a moderator to exercise cross-account denial.
- Check that direct Supabase Data API access cannot read/write application tables with a publishable key, both anonymously and with an ordinary user JWT. Review any public views or security-definer RPCs separately.
- Verify the SQLAlchemy database role can perform intended operations after the RLS change. Test backup restoration and deployment secrets without logging tokens or passwords.
- If an access token has been stolen, sign-out alone is not immediate API revocation: disable its mapped identity and follow provider session-revocation procedures. Browser XSS defenses and rate limits remain required.

### Rollout and rollback

Deploy the migration and matching frontend/backend as one coordinated release; old clients receive 410 from credential endpoints. Do not silently fall back to the insecure hash flow. If rollout fails, keep the service in maintenance mode while fixing configuration. The migration is additive for account data, but RLS/grant changes affect existing callers. Preserve and review the original grants/policies before migration; rollback of permissions must be deliberate, never a blanket grant to browser roles. Do not drop the mapping table after users have been linked.

### Validation record

- Backend: **65 tests passed**, isolated SQLite; provider calls mocked. Tests cover all protected route/method pairs without credentials, forged IDs, ownership, role changes, disabled identities, profile collisions, manual reporting, points, provider rejection/timeouts and metadata escalation. Supabase's actual signature validation and PostgreSQL migration/RLS behavior are not validated by these tests.
- Frontend: **5 suites / 15 tests passed**, including signup/confirmation, profile creation, recovery/update forms, session restoration/sign-out races, old-credential cleanup, recovery events, fresh-token attachment and preventing token forwarding to other origins. Existing React testing-library/CRA warnings remain.
- Production build passed with existing lint/toolchain warnings. Main gzip JS increased from 77.13 kB to 136.44 kB after adding the Supabase SDK; this is a bundle-size cost, not a measured page-load regression. No speedup is claimed.
- The existing dependency audit still reports 68 advisories. The next separate priority is Vite and incremental TypeScript/dependency cleanup. No live login, email delivery, database migration or deployment has been performed.
- The browser smoke check for this Auth iteration remains unverified: automatic approval review rejected launching the local test server with “blocked by policy” and no further reason. Earlier screenshots are from the pre-Auth iteration, not evidence of the new flows.

Backend Ruff lint and formatting checks passed. External services were mocked; no real provider credentials or accounts were used.
