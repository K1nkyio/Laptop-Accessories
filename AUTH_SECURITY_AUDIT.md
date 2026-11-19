# Authentication Security Audit and Upgrade Plan

Audit date: 2026-11-19. Scope: the root Express/PostgreSQL API and the customer and admin Vite clients.

## Current implementation

- Customers can register with email/password or Google, sign in, request/reset a password, and use authenticated review and account endpoints.
- Admins can sign in, bootstrap/register, reset passwords, manage admin accounts, and access protected admin routes.
- Existing passwords use bcryptjs cost 12. New passwords now use Argon2id; bcrypt remains supported and upgrades after a successful database-account login. JWTs remain signed with HS256, issuer/audience checks, random JWT IDs, and 7-day customer / 2-hour admin expiration for API compatibility.
- SQL calls inspected use parameterized values. Login uses a dummy bcrypt hash for nonexistent customer/admin rows. Password-reset tokens are random 256-bit values and stored as SHA-256 hashes with a 30-minute expiry.
- API JSON request bodies are capped at 64 KiB; CORS has an explicit origin allowlist; some security response headers and upload size limits are already present.

## Findings by risk

### High

- Existing browser access tokens are removed from localStorage after migration. Browser sign-in uses random HttpOnly sessions stored as SHA-256 hashes, with absolute/idle expiry, logout, logout-all, active-session listing, and per-session revocation.
- Email verification is absent. Customer accounts created with a password can authenticate immediately.
- Admin MFA, TOTP, passkeys, recovery codes, and step-up checks are absent.
- Auth rate limits remain process-local and are lost on restart, so they are unsuitable for multiple instances. The map is now bounded, keys use `req.ip`, and client-address forwarding is disabled unless an explicit trusted proxy hop count is configured.
- Password reset now returns a raw token only when both `NODE_ENV=development` and `EXPOSE_DEV_RESET_TOKENS=true` are explicitly set. The local ignored `.env` opts into this development-only behavior so local recovery remains usable; production must use a mail delivery flow and must never enable this flag.

### Medium

- Password-reset consumption, password update, and session revocation now run in one database statement. Legacy bearer JWTs remain valid until expiration for API compatibility.
- The `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` fallback is not a database account. Admin reset requests query only the `admins` table, so that fallback cannot use the current reset flow.
- Database-backed browser sessions load the current admin role from PostgreSQL on each protected request. Legacy bearer JWT claims remain stateless until their expiry.
- A security event table and best-effort audit writes now cover successful/failed customer/admin sign-in, registration, Google sign-in, password-reset requests/completions, and logout. MFA and privilege-change events are not yet applicable/implemented.
- Google sign-in now requires an explicit verified-email claim.
- Product image uploads trust the client supplied MIME type; the 5 MiB limit is useful but content-signature validation is not present.

### Existing controls to preserve

- Strong-secret startup check for `JWT_SECRET`; explicit JWT issuer, audience, algorithm, and expiry for legacy integrations.
- Argon2id new-password hashing with bcrypt verification and migration, generic invalid-login errors, bounded process-local throttling, parameterized SQL, password complexity checks, hashed random reset tokens, reset expiry/one-time tracking, credentialed CORS allowlist, JSON size cap, Helmet headers, CSRF origin checks for cookie writes, and server-side admin authorization middleware.

## Implementation sequence

1. Harden existing API defaults and auth throttling without changing existing routes. **Implemented in this pass:** Helmet headers, explicit proxy-hop setting, bounded address/account throttling using Express's trusted client IP, explicit opt-in for local reset-token display, atomic one-use reset/password updates, and strict Google email verification.
2. Add versioned PostgreSQL migrations and server-managed HttpOnly sessions, CSRF protection, revocation, and browser-client migration while retaining bearer JWT compatibility for integrations. **Implemented in this pass:** random 256-bit session identifiers stored only as SHA-256 hashes, HttpOnly cookies, 7-day customer / 8-hour admin absolute and 24-hour / 30-minute idle expiry, logout and logout-all endpoints, session revocation after database password resets, origin validation for cookie-authenticated writes, and localStorage token migration/removal in both clients.
3. Migrate password storage to Argon2id while verifying existing bcrypt hashes and upgrading them after successful password login. **Implemented in this pass:** Argon2id for new registrations/resets and transparent rehash for database accounts; environment-admin hashes remain externally configured.
4. Add email delivery configuration, verified-account state, secure recovery notifications, and secure fallback-admin password changes.
5. Add customer/admin security audit events and active-session/device management. **Implemented in this pass:** versioned audit-log migration, nonsecret auth event records, active session lists, and per-session revocation. Centralized permissions and stronger upload validation remain.
6. Add TOTP MFA and hashed one-use recovery codes; then add passkeys/WebAuthn with configured production origin/RP ID.
7. Expand automated backend security tests and run build/database/browser verification. **Verified here:** backend unit tests and both Vite production builds pass. PostgreSQL migrations were not applied because no disposable staging database is configured; browser interaction, live email delivery, HTTPS, shared rate-limit storage, MFA/passkeys, and production deployment remain unverified.

## Deployment constraints

The repository provides PostgreSQL but no configured email provider, Redis/shared rate-limit store, HTTPS origin, or WebAuthn relying-party domain. Those integrations need explicit deployment configuration. Numbered migrations are applied at startup under an advisory lock and a migration failure stops API startup. The legacy base schema initializer still logs and continues after individual `schema.sql` statement errors, so a clean staging database startup should be verified before deployment.
