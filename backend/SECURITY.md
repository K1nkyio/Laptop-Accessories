# Backend authentication configuration

## Local development

Copy `.env.example` to `.env` and configure the PostgreSQL URL, a random `JWT_SECRET` of at least 48 characters, and a random 32-byte base64 `ADMIN_MFA_ENCRYPTION_KEY`. Keep `.env` private. The API no longer accepts `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` fallback credentials. The checked-out local `.env` explicitly enables reset tokens for development only; production must never enable `EXPOSE_DEV_RESET_TOKENS`.

Install and start from this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

The backend uses the published Argon2 native prebuilds. Its local `.npmrc` skips dependency lifecycle scripts because this Windows workspace path contains `&`; this is compatible with the packaged Windows x64 prebuild used here.

Provision a Super Admin from this folder with `npm.cmd run bootstrap:super-admin`. The command applies the schema and migrations, asks for account details, reads the password without echoing it, and refuses to proceed if a Super Admin already exists. If the email matches an existing regular admin, the CLI promotes that account and replaces its password; otherwise it creates the initial Super Admin. Do not pass passwords as command-line arguments. After provisioning, start the API and sign in at `/admin/login`; password sign-in opens a restricted 15-minute session used only to enroll a passkey. Normal admin API access remains blocked until enrollment finishes.

Generate the MFA encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and store it as `ADMIN_MFA_ENCRYPTION_KEY` in the ignored backend `.env`. TOTP secrets are AES-256-GCM encrypted at rest. Back up this key in a managed secret store; losing it makes enrolled TOTP secrets unreadable, and key rotation/re-encryption tooling is not implemented. TOTP setup returns one-time recovery codes; save them securely because the server stores only their hashes.

For local WebAuthn, use `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:8080`, matching the admin Vite origin exactly. In production, set the relying-party ID to the deployed admin domain and set the origin to the exact HTTPS admin origin. Use Node.js 20 or later.

The API applies numbered SQL migrations once at startup, after ensuring the existing base schema. Migration failures stop API startup. The auth migrations add server-side sessions and security audit events; they do not rewrite or delete customer/admin accounts.

## Production requirements

- Set `NODE_ENV=production`, use HTTPS, and set `CLIENT_ORIGIN` to the exact customer/admin origins that need the API.
- Set `JWT_SECRET` to a randomly generated value with at least 48 characters. Set `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, and `ADMIN_MFA_ENCRYPTION_KEY`; startup fails if these production settings are absent. Browser clients use revocable sessions.
- Remove obsolete `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` variables from deployment configuration. Create the first Super Admin through the protected CLI while the API is stopped. Existing database admins must enroll a passkey with their current password before the dashboard becomes available.
- Keep `EXPOSE_DEV_RESET_TOKENS` unset or `false`. Password reset email delivery is not yet implemented, so production password recovery needs a configured mail provider before enabling the flow for customers.
- `COOKIE_SAME_SITE=lax` works when the frontend and API are same-site. For genuinely cross-site frontend/API deployments use `COOKIE_SAME_SITE=none` over HTTPS; production cookies are then `Secure` and use `__Host-` names.
- Leave `TRUST_PROXY_HOPS=0` unless the API is reachable only through a known reverse-proxy chain. Configure the exact trusted hop count; never trust arbitrary client forwarding headers.
- Back up the production database and apply/review migrations in staging before starting a production API that can apply them.
- The current auth throttle is bounded but process-local. Multiple API instances need a shared rate-limit store before horizontal scaling.

## Implemented administrator authentication

- Public administrator registration is disabled. The CLI refuses bootstrap if a Super Admin already exists, so it cannot overwrite an existing Super Admin.
- Passkey registration and authentication use SimpleWebAuthn with expiring, one-use database challenges, configured origin/RP ID checks, authenticator user verification, and signature-counter updates.
- Admins without passkeys receive a 15-minute enrollment-only session. Middleware blocks dashboard and other admin APIs until a verified passkey is registered.
- Passkeys are the primary login method. Password login can only enroll an account with no passkey, or begin a five-minute TOTP fallback challenge when TOTP is enabled.
- TOTP secrets are AES-256-GCM encrypted with a deployment-managed key. TOTP uses a 30-second window and prevents reuse of a time-step. Ten one-use recovery codes are shown once and stored as SHA-256 hashes.
- Admins can list/remove passkeys (the last credential cannot be removed), configure TOTP, and revoke sessions. TOTP disable requires the account password.

Email verification, email-delivered password recovery, complete staff invitation lifecycle, Super Admin account recovery, step-up authentication for every sensitive operation, shared rate-limit storage, customer security screens, and a complete administrator audit browser remain pending. Automated unit checks cover TOTP primitives; migrations and actual browser authenticator flows still require disposable PostgreSQL and browser validation. Do not treat this implementation as a production security sign-off until those checks and deployment configuration are reviewed.

## Manual authenticator verification

Before production rollout, use a disposable PostgreSQL database and a browser/device with a real passkey authenticator:

1. Run the protected bootstrap command, sign in with the initial password, and confirm only the enrollment page is reachable before registering a passkey.
2. Sign out, sign in with the passkey, and verify a bad response, wrong origin/RP ID, expired challenge, and replayed challenge are rejected.
3. Add a second passkey; confirm the last passkey cannot be removed and that a removed key no longer authenticates.
4. Configure TOTP, complete password-plus-TOTP sign-in, use one recovery code, then confirm that same code and a reused TOTP time-step fail.
5. Disable TOTP with the wrong password and confirm rejection; then disable with the correct password and verify TOTP fallback no longer works.
