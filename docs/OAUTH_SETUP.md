# Google sign-in

Implemented locally on 28 September 2026. Provider credentials and live sign-in have not been configured or verified by this change.

## Why this change?

1. **Previous limitation:** email/password was the only entry path, so confirmation delivery and low default email quotas blocked onboarding.
2. **Benefit:** Google can establish identity through Supabase without an eCycle signup-confirmation email. One shared React component serves login and signup; the existing API still enforces identity, role and ownership. No new package or database migration is needed.
3. **Limitations:** users depend on a provider account and its availability/policies. Google needs credentials, callback configuration and testing. OAuth does not repair missing database tables, wrong Render variables or CORS. Email/password recovery still needs working email delivery. Existing identity linking remains managed by Supabase; no custom linking by username was added.
4. **Alternatives:** custom SMTP remains appropriate for email users, but does not offer another login method. Magic links also consume email delivery. A separate Auth service or hand-written OAuth callback adds migration/security work without a current requirement. Google is the only implemented social provider now. GitHub and Microsoft were removed at the user's request to reduce setup work; Apple/Facebook/Discord are also outside current scope.

## Two different redirect addresses

```text
eCycle button → Supabase → Google
             → Supabase /auth/v1/callback → eCycle /
             → /auth/me → existing account OR Complete your profile
```

In the provider's console, register the **Supabase callback**, not `/complete-profile` and not the Render backend. In Supabase URL Configuration, allow the **frontend return URL**.

For the project last supplied in this conversation, the callback is:

```text
https://vrivrofcomctfbythzvi.supabase.co/auth/v1/callback
```

Always copy the callback from **your active Supabase project's Authentication → Sign In / Providers**. A replacement project has a different callback.

In Supabase **Authentication → URL Configuration**:

```text
Site URL: https://ecycle-webpage.onrender.com
Redirect URLs:
https://ecycle-webpage.onrender.com/
https://ecycle-webpage.onrender.com/update-password
```

For local frontend testing against hosted Supabase, also allow `http://localhost:3000/`. Provider callbacks still point to hosted Supabase. The Google button returns to `window.location.origin + '/'`; arbitrary query-string return destinations are not used.

## Google

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and select the intended project.
2. Configure branding/contact details and audience. For public Google accounts choose an external audience; add test users while using testing restrictions. Configure basic OpenID/email/profile access only.
3. **Clients → Create client → Web application**. Authorized JavaScript origin: `https://ecycle-webpage.onrender.com`. Authorized redirect URI: the Supabase callback above.
4. Copy Client ID and Client Secret into **Supabase → Authentication → Sign In / Providers → Google**. Enable and save.

This OAuth client is separate from your Google Maps API keys. [Official Google-provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Credentials and deployment

Provider client secrets belong in **Supabase provider settings only**. Do not put them in React, Git or this document. Existing public frontend Supabase URL/key are sufficient; no provider-specific frontend environment variables were added.

Local operator exception requested on 28 September: a Google client ID/secret copy is stored in ignored `backend/.env` as `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`. These are not read by the app; enter their values in Supabase's Google provider settings to enable Google login. Do not copy them into frontend variables. Downloaded `client_secret_*.json` files are also ignored by Git.

The frontend still needs `REACT_APP_API_URL` pointing to the actual deployed backend, plus `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` for the same project as the backend. Backend `CORS_ORIGINS` must include `https://ecycle-webpage.onrender.com`. OAuth cannot bypass these requirements.

Deploy the frontend source changes after configuring Google. Only the Google button is displayed; it is not usable until Google is enabled in Supabase. Returning provider errors get a generic retry message when the redirect reaches the app; errors that leave the browser on a provider/Supabase error page must be fixed in that service's configuration. No raw provider errors or callback token values are echoed by the component.

The existing browser SDK consumes the Auth callback session using its current flow; this change does not migrate to a cookie/BFF or custom PKCE callback architecture. AuthContext still calls `/auth/me`, and only a server `403 profile_required` opens onboarding. No role is granted from Google metadata. An OAuth-only user does not need to choose an eCycle password. A user reclaiming historical data should follow verified operator linking in [AUTH_UPGRADE.md](AUTH_UPGRADE.md), not create a privileged mapping by matching a username.

## Verification and remaining work

Automated validation results are recorded in [UPGRADE_PLAN.md](UPGRADE_PLAN.md). Tests mock provider calls: they do not establish that credentials, provider approvals, email claims or live redirects are correct.

Before considering deployment complete, test Google:

- From both login and signup, choose the provider without entering email/password.
- Sign in as a new user; verify profile completion offers Resident/Shop only.
- Sign out and return with the same provider; verify the same application account loads.
- Cancel consent; confirm usable navigation back to login.
- Test an existing email user without manually granting/linking privileges; verify the resulting identity before claiming account-linking behavior.
- Check a phone-width viewport and keyboard navigation.

SMTP remains necessary for users who choose email signup/reset. Do not disable email confirmation as an OAuth setup step.
