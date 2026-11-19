# Authentication Security Audit and Upgrade Plan

Audit date: 2026-11-19. Scope: the root Express/PostgreSQL API and the customer and admin Vite clients.

## Current implementation

- Customers can register with email/password or Google, sign in, request/reset a password, and use authenticated review and account endpoints.
- Admins can sign in with passkeys, use password plus TOTP as fallback, reset passwords, manage admin accounts, and access protected admin routes. Passkey enrollment is required before normal admin access.
- Existing passwords use bcryptjs cost 12. New passwords now use Argon2id; bcrypt remains supported and upgrades after a successful database-account login. JWTs remain signed with HS256, issuer/audience checks, random JWT IDs, and 7-day customer / 2-hour admin expiration for API compatibility.
- Public admin registration has been removed from the login screen and API. The API requires a passkey-authenticated Super Admin to add accounts. Initial provisioning uses `npm run bootstrap:super-admin`, which refuses to run when a Super Admin exists and can recover an installation that has only regular admin accounts. The API no longer authenticates `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` fallback credentials.
- Passkeys use SimpleWebAuthn, persistent credential public keys, five-minute one-use challenges, strict expected origin/RP ID verification, required user verification, and counter updates. No private key material is stored.
- Accounts without a registered passkey can only receive a 15-minute enrollment-only cookie after correct password login. Server middleware rejects dashboard/API access until passkey verification completes.
- TOTP fallback requires password verification followed by a five-minute single-use challenge; TOTP secrets are AES-256-GCM encrypted, time-step reuse is blocked, and one-use recovery codes are stored only as hashes.
- SQL calls inspected use parameterized values. Login uses a dummy bcrypt hash for nonexistent customer/admin rows. Password-reset tokens are random 256-bit values and stored as SHA-256 hashes with a 30-minute expiry.
- API JSON request bodies are capped at 64 KiB; CORS has an explicit origin allowlist; some security response headers and upload size limits are already present.

## Findings by risk

### High

- Existing browser access tokens are removed from localStorage after migration. Browser sign-in uses random HttpOnly sessions stored as SHA-256 hashes, with absolute/idle expiry, logout, logout-all, active-session listing, and per-session revocation.
- Email verification is absent. Customer accounts created with a password can authenticate immediately.
- Step-up checks for all sensitive operations are not yet consistently enforced. TOTP is an optional password fallback after passkey enrollment.
- Auth rate limits remain process-local and are lost on restart, so they are unsuitable for multiple instances. The map is now bounded, keys use `req.ip`, and client-address forwarding is disabled unless an explicit trusted proxy hop count is configured.
- Password reset now returns a raw token only when both `NODE_ENV=development` and `EXPOSE_DEV_RESET_TOKENS=true` are explicitly set. The local ignored `.env` opts into this development-only behavior so local recovery remains usable; production must use a mail delivery flow and must never enable this flag.

### Medium

- Password-reset consumption, password update, and session revocation now run in one database statement. Legacy bearer JWTs remain valid until expiration for API compatibility.
- Admin reset requests query only the `admins` table and still lack a production email-delivery integration.
- Database-backed browser sessions and legacy admin bearer tokens load the current admin role and passkey-enrollment state from PostgreSQL on protected requests.
- A security event table and best-effort audit writes cover successful/failed customer/admin sign-in, passkey registration/removal, TOTP setup/enable/disable/fallback, registration, Google sign-in, password-reset requests/completions, bootstrap, and logout. Privilege-change events remain incomplete.
- Google sign-in now requires an explicit verified-email claim.
- Product image uploads trust the client supplied MIME type; the 5 MiB limit is useful but content-signature validation is not present.

### Existing controls to preserve

- Strong-secret startup check for `JWT_SECRET`; explicit JWT issuer, audience, algorithm, and expiry for legacy integrations.
- Argon2id new-password hashing with bcrypt verification and migration, generic invalid-login errors, bounded process-local throttling, parameterized SQL, password complexity checks, hashed random reset tokens, reset expiry/one-time tracking, credentialed CORS allowlist, JSON size cap, Helmet headers, CSRF origin checks for cookie writes, and server-side admin authorization middleware.

## Implementation sequence

1. Harden existing API defaults and auth throttling without changing existing routes. **Implemented in this pass:** Helmet headers, explicit proxy-hop setting, bounded address/account throttling using Express's trusted client IP, explicit opt-in for local reset-token display, atomic one-use reset/password updates, and strict Google email verification.
2. Add versioned PostgreSQL migrations and server-managed HttpOnly sessions, CSRF protection, revocation, and browser-client migration while retaining bearer JWT compatibility for integrations. **Implemented in this pass:** random 256-bit session identifiers stored only as SHA-256 hashes, HttpOnly cookies, 7-day customer / 8-hour admin absolute and 24-hour / 30-minute idle expiry, logout and logout-all endpoints, session revocation after database password resets, origin validation for cookie-authenticated writes, and localStorage token migration/removal in both clients.
3. Migrate password storage to Argon2id while verifying existing bcrypt hashes and upgrading them after successful password login. **Implemented:** Argon2id for new registrations/resets and transparent rehash for database accounts.
4. Add email delivery configuration, verified-account state, secure recovery notifications, and secure fallback-admin password changes.
5. Add customer/admin security audit events and active-session/device management. **Implemented in this pass:** versioned audit-log migration, nonsecret auth event records, active session lists, and per-session revocation. Centralized permissions and stronger upload validation remain.
6. TOTP fallback, hashed one-use recovery codes, passkey enrollment and authentication, and the one-time CLI bootstrap are implemented.
7. Automated TOTP primitive checks and frontend/backend syntax/build checks are available. PostgreSQL migrations were not applied because no disposable staging database is configured; real authenticator interaction, challenge replay, HTTPS, shared rate-limit storage, and production deployment remain unverified.

Current npm advisory follow-up: backend production dependencies audit clean after upgrading SimpleWebAuthn to 13.3.3. Admin production dependencies retain two moderate React Router 6 advisories; the available fix is a major React Router 7 upgrade and was not applied in this pass.

## Deployment constraints

The repository provides PostgreSQL but no configured email provider, Redis/shared rate-limit store, HTTPS origin, or WebAuthn relying-party domain. Those integrations need explicit deployment configuration. Numbered migrations are applied at startup under an advisory lock and a migration failure stops API startup. The legacy base schema initializer still logs and continues after individual `schema.sql` statement errors, so a clean staging database startup should be verified before deployment.
