# Backend authentication configuration

## Local development

Copy `.env.example` to `.env` and configure the PostgreSQL URL, a random `JWT_SECRET` of at least 48 characters, and a random 32-byte base64 `ADMIN_MFA_ENCRYPTION_KEY`. Keep `.env` private. The API no longer accepts `ADMIN_EMAIL` or `ADMIN_PASSWORD_HASH` fallback credentials. The checked-out local `.env` explicitly enables reset tokens for development only; production must never enable `EXPOSE_DEV_RESET_TOKENS`.

Install and start from this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

The backend uses the published Argon2 native prebuilds. Its local `.npmrc` skips dependency lifecycle scripts because this Windows workspace path contains `&`; this is compatible with the packaged Windows x64 prebuild used here.

Provision a Super Admin from this folder with `npm.cmd run bootstrap:super-admin`. Stop the API first. The command applies the schema and migrations, asks for account details, reads the password without echoing it, and refuses to proceed if a Super Admin already exists. If the email matches an existing regular admin, the CLI promotes that account and replaces its password; otherwise it creates the initial Super Admin. Do not pass passwords as command-line arguments.

If the existing Super Admin credentials are unknown, list the local Super Admin identities with `npm.cmd run recover:super-admin -- --list`. Stop the API, then run `npm.cmd run recover:super-admin`. Enter the exact email of the existing Super Admin, choose a new password, and type the displayed `RESET <email>` confirmation. Recovery revokes all sessions and passkeys, removes TOTP and recovery codes, and requires the owner to enroll the passkey and authenticator again. It cannot create a new Super Admin or recover an account by email alone; local shell and database access are required. Then restart the API and sign in at `/admin/login`.

First sign-in opens a restricted 15-minute onboarding session. Register a passkey, set up an authenticator app, verify its current code, and save the one-time recovery codes before continuing to the dashboard. Both factors are required for all normal admin API access. In Security, admins can update their name, email, and password after confirming the current password; other active sessions are revoked after a credential change.

Generate the MFA encryption key locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and store it as `ADMIN_MFA_ENCRYPTION_KEY` in the ignored backend `.env`. TOTP secrets are AES-256-GCM encrypted at rest. Back up this key in a managed secret store; losing it makes enrolled TOTP secrets unreadable, and key rotation/re-encryption tooling is not implemented. TOTP setup returns one-time recovery codes; save them securely because the server stores only their hashes.

For local WebAuthn, use `WEBAUTHN_RP_ID=localhost` and `WEBAUTHN_ORIGIN=http://localhost:8080`, matching the admin Vite origin exactly. In production, set the relying-party ID to the deployed admin domain and set the origin to the exact HTTPS admin origin. Use Node.js 20 or later.

The API applies numbered SQL migrations once at startup, after ensuring the existing base schema. Migration failures stop API startup. The auth migrations add server-side sessions and security audit events; they do not rewrite or delete customer/admin accounts.

## M-Pesa checkout (Daraja)

Create a Daraja application in the [Safaricom developer portal](https://developer.safaricom.co.ke/apis/GettingStarted), then configure `MPESA_ENV=sandbox`, the consumer key/secret, shortcode, and passkey in the private backend `.env`. `MPESA_CALLBACK_URL` is the public HTTPS base URL of this API (for example, your deployed API origin); Safaricom must be able to reach it. Set `MPESA_CALLBACK_TOKEN` to a long random secret, for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never expose Daraja credentials or this callback token in frontend variables. Switch to `MPESA_ENV=production` only after Safaricom production access has been approved and the live shortcode/passkey are configured.

Checkout requires customer login and KES-priced products. The API recalculates item prices and stock from PostgreSQL, creates order/payment records, and sends an STK Push. The customer approves on their phone; the callback updates payment status and the status page polls the authenticated order endpoint. Localhost is not reachable by Safaricom, so use a temporary HTTPS tunnel only for sandbox callback development. Payment confirmation, callback delivery, reversals, refunds, and fulfillment still need monitoring and operator workflows before relying on this for production sales.

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
- Admins missing either required factor receive a 15-minute enrollment-only session. Middleware blocks dashboard and other admin APIs until both a passkey and authenticator app are verified.
- Passkeys are the primary login method. Password login can begin a restricted factor-enrollment session, or a five-minute TOTP fallback challenge after both factors have been enrolled.
- TOTP secrets are AES-256-GCM encrypted with a deployment-managed key. TOTP uses a 30-second window and prevents reuse of a time-step. Ten one-use recovery codes are shown once and stored as SHA-256 hashes.
- Admins can list/remove passkeys (the last credential cannot be removed), review TOTP recovery-code status, revoke sessions, and update their own name, email, and password after current-password verification. Credential changes revoke other active sessions.

Email verification, email-delivered password recovery, complete staff invitation lifecycle, step-up authentication for every sensitive operation, shared rate-limit storage, customer security screens, and a complete administrator audit browser remain pending. The local CLI recovery path requires shell and database access. Automated unit checks cover TOTP primitives; migrations and actual browser authenticator flows still require disposable PostgreSQL and browser validation. Do not treat this implementation as a production security sign-off until those checks and deployment configuration are reviewed.

## Manual authenticator verification

Before production rollout, use a disposable PostgreSQL database and a browser/device with a real passkey authenticator:

1. Run the protected bootstrap command, sign in with the initial password, and confirm only the onboarding page is reachable before registering a passkey and authenticator.
2. Sign out, sign in with the passkey, and verify a bad response, wrong origin/RP ID, expired challenge, and replayed challenge are rejected.
3. Add a second passkey; confirm the last passkey cannot be removed and that a removed key no longer authenticates.
4. Configure TOTP, complete password-plus-TOTP sign-in, use one recovery code, then confirm that same code and a reused TOTP time-step fail.
5. Change the admin email and password with the current password, confirm other sessions are revoked, and verify the new credentials work.
