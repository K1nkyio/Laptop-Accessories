# Backend authentication configuration

## Local development

Copy `.env.example` to `.env` and configure the PostgreSQL URL, a random `JWT_SECRET` of at least 48 characters, and the admin credentials. Keep `.env` private. The checked-out local `.env` explicitly enables reset tokens for development only; production must never enable `EXPOSE_DEV_RESET_TOKENS`.

Install and start from this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

The backend uses the published Argon2 native prebuilds. Its local `.npmrc` skips dependency lifecycle scripts because this Windows workspace path contains `&`; this is compatible with the packaged Windows x64 prebuild used here.

The API applies numbered SQL migrations once at startup, after ensuring the existing base schema. Migration failures stop API startup. The auth migrations add server-side sessions and security audit events; they do not rewrite or delete customer/admin accounts.

## Production requirements

- Set `NODE_ENV=production`, use HTTPS, and set `CLIENT_ORIGIN` to the exact customer/admin origins that need the API.
- Set `JWT_SECRET` to a randomly generated value with at least 48 characters. Legacy bearer JWT integration remains available; browser clients use revocable sessions.
- Keep `EXPOSE_DEV_RESET_TOKENS` unset or `false`. Password reset email delivery is not yet implemented, so production password recovery needs a configured mail provider before enabling the flow for customers.
- `COOKIE_SAME_SITE=lax` works when the frontend and API are same-site. For genuinely cross-site frontend/API deployments use `COOKIE_SAME_SITE=none` over HTTPS; production cookies are then `Secure` and use `__Host-` names.
- Leave `TRUST_PROXY_HOPS=0` unless the API is reachable only through a known reverse-proxy chain. Configure the exact trusted hop count; never trust arbitrary client forwarding headers.
- Back up the production database and apply/review migrations in staging before starting a production API that can apply them.
- The current auth throttle is bounded but process-local. Multiple API instances need a shared rate-limit store before horizontal scaling.

## Remaining authentication work

Email verification, email-delivered recovery, customer account status, TOTP, recovery codes, passkeys, and step-up authentication are still pending. Security audit records and session list/revocation APIs exist; customer/admin dashboard screens for session management are not yet implemented. Admin MFA and phishing-resistant enforcement are not yet implemented. Do not treat this first implementation pass as a production security sign-off.
