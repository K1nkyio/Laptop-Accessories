import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { createAuthRateLimiter } from "./security/auth-rate-limit.js";
import { hashPassword, needsPasswordRehash, verifyPassword } from "./security/password-hash.js";
import { assertTotpEncryptionKey, createRecoveryCodes, decryptTotpSecret, encryptTotpSecret, hashRecoveryCode, makeOtpAuthUrl, randomTotpSecret, verifyTotp } from "./security/totp.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
const { pool, query } = await import("./db.js");

const port = Number(process.env.PORT ?? 4000);
const jwtSecret = process.env.JWT_SECRET;
const exposeDevResetTokens = process.env.NODE_ENV === "development" && process.env.EXPOSE_DEV_RESET_TOKENS === "true";
const production = process.env.NODE_ENV === "production";
const cookieSameSite = String(process.env.COOKIE_SAME_SITE ?? "lax").toLowerCase();
const customerCookieName = production ? "__Host-store_session" : "store_session";
const adminCookieName = production ? "__Host-admin_session" : "admin_session";
const webauthnRpName = process.env.WEBAUTHN_RP_NAME ?? "TechHub Admin";
const webauthnRpId = process.env.WEBAUTHN_RP_ID ?? "localhost";
const webauthnOrigin = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:8080";
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new Error("Only image uploads are allowed"));
  },
});

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}
if (production && (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGIN || !process.env.ADMIN_MFA_ENCRYPTION_KEY)) {
  throw new Error("Production requires explicit WEBAUTHN_RP_ID, WEBAUTHN_ORIGIN, and ADMIN_MFA_ENCRYPTION_KEY configuration");
}
if (production) assertTotpEncryptionKey();

if (jwtSecret.length < 48 || jwtSecret === "replace-this-with-a-long-random-secret") {
  throw new Error("JWT_SECRET must be a strong random value");
}

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5");
}
if (!["lax", "strict", "none"].includes(cookieSameSite) || (cookieSameSite === "none" && !production)) {
  throw new Error("COOKIE_SAME_SITE must be lax, strict, or none; none requires production HTTPS");
}

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:8080,http://localhost:8081,http://localhost:8082,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false,
}));
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  }),
);
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }

  const cookies = parseCookies(req);
  const hasAuthCookie = Boolean(cookies[customerCookieName] || cookies[adminCookieName]);
  if (!hasAuthCookie) {
    next();
    return;
  }

  const origin = req.get("origin") ?? "";
  if (!allowedOrigins.includes(origin)) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }
  next();
});
app.use(express.json({ limit: "64kb" }));
app.use("/uploads", express.static(uploadDir));

const rateLimitAuth = createAuthRateLimiter();
const dummyPasswordHash = "$2b$12$kJmV8qps5B7wQqg.RMkw1ev3MHcT5WJ6Mhrplc7vpyxQHjjWxSZ66";
const defaultStoreSettings = {
  storeName: "Stacked",
  supportPhone: "+254 700 000 000",
  whatsappNumber: "254700000000",
  defaultWarranty: "Two years on laptops, one year on accessories.",
  shippingNote: "Orders dispatch in 24 hours when stock is available.",
  showFeaturedProducts: true,
  showWarrantyStrip: true,
  showLowStockUrgency: true,
  heroEyebrow: "New arrivals - 2026 ready",
  heroTitle: "Work-ready tech without the buying noise.",
  heroDescription:
    "Shop vetted laptops, docks, keyboards, mice, and carry gear with honest stock status, fast local follow-up, and support that knows the product.",
};

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function publicUser(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
  };
}

function publicAdmin(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? "admin",
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: "customer" }, jwtSecret, {
    expiresIn: "7d",
    issuer: "techhub-api",
    audience: "techhub-storefront",
    jwtid: crypto.randomUUID(),
  });
}

function verifyCustomerBearer(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.auth = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "techhub-api",
      audience: "techhub-storefront",
    });
    next();
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

function requireAuth(req, res, next) {
  const token = parseCookies(req)[customerCookieName];
  if (!token) {
    verifyCustomerBearer(req, res, next);
    return;
  }

  loadCustomerSession(token).then((session) => {
    if (!session) {
      verifyCustomerBearer(req, res, next);
      return;
    }
    req.auth = { sub: session.id, email: session.email, role: "customer", sessionId: session.session_id };
    next();
  }).catch(next);
}

function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email, role: admin.role ?? "admin" }, jwtSecret, {
    expiresIn: "2h",
    issuer: "techhub-api",
    audience: "techhub-admin",
    jwtid: crypto.randomUUID(),
  });
}

function resetTokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie ?? "";
  return Object.fromEntries(header.split(";").map((item) => {
    const separator = item.indexOf("=");
    if (separator < 0) return ["", ""];
    const key = item.slice(0, separator).trim();
    try {
      return [key, decodeURIComponent(item.slice(separator + 1).trim())];
    } catch (_error) {
      return [key, ""];
    }
  }).filter(([key]) => key));
}

function appendSessionCookie(res, name, value, maxAgeSeconds) {
  const sameSite = `${cookieSameSite[0].toUpperCase()}${cookieSameSite.slice(1)}`;
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", `SameSite=${sameSite}`, `Max-Age=${maxAgeSeconds}`];
  if (production) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res, isAdmin = false) {
  const name = isAdmin ? adminCookieName : customerCookieName;
  const sameSite = `${cookieSameSite[0].toUpperCase()}${cookieSameSite.slice(1)}`;
  const parts = [`${name}=`, "Path=/", "HttpOnly", `SameSite=${sameSite}`, "Max-Age=0"];
  if (production) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

async function createBrowserSession(req, res, principal) {
  const isAdmin = Boolean(principal.adminId);
  const lifetimeMs = principal.adminEnrollmentOnly ? 15 * 60 * 1000 : isAdmin ? 8 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const idleMs = principal.adminEnrollmentOnly ? 10 * 60 * 1000 : isAdmin ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const ipAddress = req.ip && /^[0-9a-f:.]+$/i.test(req.ip) ? req.ip : null;
  const userAgent = String(req.get("user-agent") ?? "").slice(0, 512) || null;

  await query(
    `
      insert into auth_sessions (user_id, admin_id, env_admin_email, admin_enrollment_only, token_hash, expires_at, idle_expires_at, ip_address, user_agent)
      values ($1, $2, null, $3, $4, now() + ($5 * interval '1 millisecond'), now() + ($6 * interval '1 millisecond'), $7, $8)
    `,
    [principal.userId ?? null, principal.adminId ?? null, Boolean(principal.adminEnrollmentOnly), tokenHash, lifetimeMs, idleMs, ipAddress, userAgent],
  );

  appendSessionCookie(res, isAdmin ? adminCookieName : customerCookieName, token, Math.floor(lifetimeMs / 1000));
}

function authResponse(req, identity, token) {
  const origin = req.get("origin") ?? "";
  return allowedOrigins.includes(origin) ? identity : { ...identity, token };
}

async function writeSecurityEvent(req, eventType, principal = {}, metadata = {}) {
  const ipAddress = req.ip && /^[0-9a-f:.]+$/i.test(req.ip) ? req.ip : null;
  const userAgent = String(req.get("user-agent") ?? "").slice(0, 512) || null;
  try {
    await query(
    `
      insert into security_audit_logs (user_id, admin_id, event_type, ip_address, user_agent, metadata)
      values ($1, $2, $3, $4, $5, $6::jsonb)
    `,
      [principal.userId ?? null, principal.adminId ?? null, eventType, ipAddress, userAgent, JSON.stringify(metadata)],
    );
  } catch (error) {
    // Audit logging must not expose authentication secrets or break a valid sign-in.
    console.error("Security audit event could not be stored:", error.message);
  }
}

async function loadCustomerSession(token) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await query(
    `
      update auth_sessions s
      set last_seen_at = now(), idle_expires_at = least(s.expires_at, now() + interval '24 hours')
      from users u
      where s.user_id = u.id and s.token_hash = $1 and s.revoked_at is null
        and s.idle_expires_at > now() and s.expires_at > now()
      returning s.id as session_id, u.id, u.email
    `,
    [tokenHash],
  );
  return rows[0] ?? null;
}

async function loadAdminSession(token) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await query(
    `
      update auth_sessions s
      set last_seen_at = now(), idle_expires_at = least(s.expires_at, now() + interval '30 minutes')
      from admins a
      where s.admin_id = a.id and s.token_hash = $1 and s.revoked_at is null
        and s.idle_expires_at > now() and s.expires_at > now()
      returning s.id as session_id, s.admin_enrollment_only, a.id, a.name, a.email, a.role
    `,
    [tokenHash],
  );
  return rows[0] ? { ...rows[0], role: rows[0].role ?? "admin" } : null;
}

function decodeGoogleCredential(credential) {
  const parts = String(credential ?? "").split(".");
  if (parts.length < 2) return null;

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch (_error) {
    return null;
  }
}

async function verifyGoogleCredential(credential) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) return null;
  return response.json();
}

function settingPayload(row) {
  return { ...defaultStoreSettings, ...(row?.value ?? {}) };
}

function verifyAdminBearer(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "techhub-api",
      audience: "techhub-admin",
    });

    if (!["admin", "super_admin"].includes(payload.role)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    query("select id, name, email, role, passkey_enrolled_at, totp_enabled_at, exists(select 1 from admin_passkeys p where p.admin_id = admins.id) as has_passkey from admins where id = $1", [payload.sub]).then(({ rows }) => {
      if (!rows[0] || !rows[0].passkey_enrolled_at || !rows[0].has_passkey) {
        res.status(403).json({ error: "Passkey enrollment is required", code: "PASSKEY_ENROLLMENT_REQUIRED" });
        return;
      }
      if (!rows[0].totp_enabled_at) { res.status(403).json({ error: "Authenticator setup is required", code: "TOTP_ENROLLMENT_REQUIRED" }); return; }
      req.admin = { ...payload, sub: rows[0].id, email: rows[0].email, role: rows[0].role, name: rows[0].name };
      next();
    }).catch(next);
  } catch (_error) {
    res.status(401).json({ error: "Invalid or expired admin session" });
  }
}

function requireAdmin(req, res, next) {
  const token = parseCookies(req)[adminCookieName];
  if (!token) {
    verifyAdminBearer(req, res, next);
    return;
  }

  loadAdminSession(token).then(async (session) => {
    if (!session) {
      verifyAdminBearer(req, res, next);
      return;
    }
    if (session.admin_enrollment_only) {
      res.status(403).json({ error: "Complete passkey enrollment before using the dashboard", code: "PASSKEY_ENROLLMENT_REQUIRED" });
      return;
    }
    const { rows } = await query("select id, name, email, role, passkey_enrolled_at, totp_enabled_at, exists(select 1 from admin_passkeys p where p.admin_id = admins.id) as has_passkey from admins where id = $1", [session.id]);
    if (!rows[0] || !rows[0].passkey_enrolled_at || !rows[0].has_passkey) {
      res.status(403).json({ error: "Passkey enrollment is required", code: "PASSKEY_ENROLLMENT_REQUIRED" });
      return;
    }
    if (!rows[0].totp_enabled_at) { res.status(403).json({ error: "Authenticator setup is required", code: "TOTP_ENROLLMENT_REQUIRED" }); return; }
    if (!["admin", "super_admin"].includes(rows[0].role)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.admin = {
      sub: rows[0].id,
      email: rows[0].email,
      role: rows[0].role,
      name: rows[0].name,
      sessionId: session.session_id,
    };
    next();
  }).catch(next);
}

function requirePasskeyRegistration(req, res, next) {
  const token = parseCookies(req)[adminCookieName];
  if (token) {
    loadAdminSession(token).then((session) => {
      if (!session) { res.status(401).json({ error: "Admin session required" }); return; }
      if (session.admin_enrollment_only) {
        req.admin = { sub: session.id, email: session.email, role: session.role, name: session.name, sessionId: session.session_id, enrollmentOnly: true };
        next();
        return;
      }
      requireAdmin(req, res, next);
    }).catch(next);
    return;
  }
  requireAdmin(req, res, next);
}

function requireSecurityEnrollment(req, res, next) {
  const token = parseCookies(req)[adminCookieName];
  if (!token) { res.status(401).json({ error: "Admin enrollment session required" }); return; }
  loadAdminSession(token).then((session) => {
    if (!session) { res.status(401).json({ error: "Admin enrollment session expired" }); return; }
    if (session.admin_enrollment_only) {
      req.admin = { sub: session.id, email: session.email, role: session.role, name: session.name, sessionId: session.session_id, enrollmentOnly: true };
      next();
      return;
    }
    requireAdmin(req, res, next);
  }).catch(next);
}

function requireSuperAdmin(req, res, next) {
  requireAdmin(req, res, () => {
    if (req.admin.role !== "super_admin") {
      res.status(403).json({ error: "Super admin access required" });
      return;
    }

    next();
  });
}

function clearAuthAttempts(req) {
  rateLimitAuth.clear(req);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function strongPassword(password) {
  return password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productPayload(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    brand: row.brand,
    price: Number(row.price),
    currency: row.currency,
    image_url: row.image_url,
    stock: row.stock,
    discount_price: row.discount_price === null ? null : Number(row.discount_price),
    condition: row.condition,
    specifications: row.specifications,
    warranty: row.warranty,
    status: row.status,
    category_id: row.category_id,
    subcategory_id: row.subcategory_id,
    product_type: row.product_type,
    is_featured: row.is_featured,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

app.get("/api/health", async (_req, res, next) => {
  try {
    const result = await query("select now() as database_time");
    res.json({
      status: "ok",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      select
        c.id,
        c.name,
        c.slug,
        c.description,
        c.sort_order,
        coalesce(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'slug', s.slug)
            order by s.sort_order
          ) filter (where s.id is not null),
          '[]'
        ) as subcategories
      from categories c
      left join subcategories s on s.category_id = c.id
      group by c.id
      order by c.sort_order
    `);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/login", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const { rows } = await query(
      `select id, name, email, password_hash, role, passkey_enrolled_at, totp_secret_ciphertext, totp_enabled_at,
        exists(select 1 from admin_passkeys p where p.admin_id = admins.id) as has_passkey
       from admins where email = $1`,
      [email],
    );
    const adminRow = rows[0];
    const matchesPassword = await verifyPassword(password, adminRow?.password_hash ?? dummyPasswordHash);
    if (!adminRow || !matchesPassword) {
      await writeSecurityEvent(req, "admin.login_failed");
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (needsPasswordRehash(adminRow.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await query("update admins set password_hash = $2, updated_at = now() where id = $1", [adminRow.id, upgradedHash]);
    }

    const admin = publicAdmin(adminRow);
    if (adminRow.passkey_enrolled_at && adminRow.has_passkey && adminRow.totp_enabled_at) {
      const token = crypto.randomBytes(32).toString("base64url");
      await query("delete from admin_totp_challenges where expires_at <= now() or consumed_at is not null");
      await query("insert into admin_totp_challenges(admin_id, token_hash, expires_at) values ($1, $2, now() + interval '5 minutes')", [adminRow.id, resetTokenHash(token)]);
      await writeSecurityEvent(req, "admin.totp_fallback_challenge_created", { adminId: adminRow.id });
      res.json({ mfaRequired: true, challenge: token, admin });
      return;
    }
    await createBrowserSession(req, res, { adminId: adminRow.id, adminEnrollmentOnly: true });
    await writeSecurityEvent(req, "admin.security_enrollment_required", { adminId: adminRow.id });
    clearAuthAttempts(req);
    res.json({ admin, needsSecurityEnrollment: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/passkeys/login/options", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) { res.status(400).json({ error: "Enter a valid email address" }); return; }
    const { rows } = await query("select id, email, name from admins where email = $1 and passkey_enrolled_at is not null and exists(select 1 from admin_passkeys p where p.admin_id = admins.id)", [email]);
    if (!rows[0]) { res.status(401).json({ error: "Passkey sign-in could not be started" }); return; }
    const admin = rows[0];
    const { rows: credentials } = await query("select credential_id, transports from admin_passkeys where admin_id = $1", [admin.id]);
    if (!credentials.length) { res.status(401).json({ error: "Passkey sign-in could not be started" }); return; }
    const options = await generateAuthenticationOptions({
      rpID: webauthnRpId,
      allowCredentials: credentials.map((credential) => ({ id: credential.credential_id, transports: credential.transports })),
      userVerification: "required",
    });
    const challenge = crypto.randomUUID();
    await query("delete from admin_webauthn_challenges where expires_at <= now() or consumed_at is not null");
    await query("insert into admin_webauthn_challenges(id, admin_id, purpose, challenge, expires_at) values ($1, $2, 'authentication', $3, now() + interval '5 minutes')", [challenge, admin.id, options.challenge]);
    res.json({ challengeId: challenge, options });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/passkeys/login/verify", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const challengeId = String(req.body.challengeId ?? "");
    const { rows: challenges } = await query(
      `update admin_webauthn_challenges set consumed_at = now()
       where id = $1 and purpose = 'authentication' and consumed_at is null and expires_at > now()
         and admin_id = (select id from admins where email = $2)
       returning admin_id, challenge`,
      [challengeId, email],
    );
    if (!challenges[0]) { res.status(401).json({ error: "Passkey challenge is invalid or expired" }); return; }
    const { rows } = await query("select id, name, email, role, totp_enabled_at from admins where id = $1 and passkey_enrolled_at is not null and exists(select 1 from admin_passkeys p where p.admin_id = admins.id)", [challenges[0].admin_id]);
    const adminRow = rows[0];
    const { rows: credentials } = await query("select * from admin_passkeys where admin_id = $1 and credential_id = $2", [adminRow?.id, String(req.body.response?.id ?? "")]);
    if (!adminRow || !credentials[0]) { res.status(401).json({ error: "Passkey sign-in failed" }); return; }
    const passkey = credentials[0];
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: req.body.response,
        expectedChallenge: challenges[0].challenge,
        expectedOrigin: webauthnOrigin,
        expectedRPID: webauthnRpId,
        credential: { id: passkey.credential_id, publicKey: new Uint8Array(passkey.public_key), counter: Number(passkey.counter), transports: passkey.transports },
        requireUserVerification: true,
      });
    } catch (_error) {
      await writeSecurityEvent(req, "admin.passkey_login_failed", { adminId: adminRow.id });
      res.status(401).json({ error: "Passkey sign-in failed" });
      return;
    }
    if (!verification.verified) { res.status(401).json({ error: "Passkey sign-in failed" }); return; }
    await query("update admin_passkeys set counter = $2, last_used_at = now() where id = $1", [passkey.id, verification.authenticationInfo.newCounter]);
    const admin = publicAdmin(adminRow);
    const needsSecurityEnrollment = !adminRow.totp_enabled_at;
    await createBrowserSession(req, res, { adminId: admin.id, adminEnrollmentOnly: needsSecurityEnrollment });
    await writeSecurityEvent(req, "admin.passkey_login_succeeded", { adminId: admin.id }, { passkeyId: passkey.id });
    clearAuthAttempts(req);
    res.json(authResponse(req, { admin, needsSecurityEnrollment }, needsSecurityEnrollment ? undefined : signAdminToken(admin)));
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/passkeys/register/options", rateLimitAuth, requirePasskeyRegistration, async (req, res, next) => {
  try {
    const { rows: admins } = await query("select id, name, email from admins where id = $1", [req.admin.sub]);
    if (!admins[0]) { res.status(401).json({ error: "Admin account not found" }); return; }
    const { rows: credentials } = await query("select credential_id, transports from admin_passkeys where admin_id = $1", [req.admin.sub]);
    const options = await generateRegistrationOptions({
      rpName: webauthnRpName,
      rpID: webauthnRpId,
      userID: Buffer.from(admins[0].id.replaceAll("-", ""), "hex"),
      userName: admins[0].email,
      userDisplayName: admins[0].name,
      attestationType: "none",
      excludeCredentials: credentials.map((credential) => ({ id: credential.credential_id, transports: credential.transports })),
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      supportedAlgorithmIDs: [-7, -257],
    });
    const challengeId = crypto.randomUUID();
    await query("delete from admin_webauthn_challenges where expires_at <= now() or consumed_at is not null");
    await query("insert into admin_webauthn_challenges(id, admin_id, purpose, challenge, expires_at) values ($1, $2, 'registration', $3, now() + interval '5 minutes')", [challengeId, req.admin.sub, options.challenge]);
    res.json({ challengeId, options });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/passkeys/register/verify", rateLimitAuth, requirePasskeyRegistration, async (req, res, next) => {
  try {
    const { rows: challenges } = await query(
      `update admin_webauthn_challenges set consumed_at = now()
       where id = $1 and admin_id = $2 and purpose = 'registration' and consumed_at is null and expires_at > now()
       returning challenge`,
      [String(req.body.challengeId ?? ""), req.admin.sub],
    );
    if (!challenges[0]) { res.status(400).json({ error: "Passkey registration challenge is invalid or expired" }); return; }
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: req.body.response,
        expectedChallenge: challenges[0].challenge,
        expectedOrigin: webauthnOrigin,
        expectedRPID: webauthnRpId,
        requireUserVerification: true,
      });
    } catch (_error) { res.status(400).json({ error: "Passkey registration could not be verified" }); return; }
    if (!verification.verified || !verification.registrationInfo) { res.status(400).json({ error: "Passkey registration could not be verified" }); return; }
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const transports = Array.isArray(req.body.response?.response?.transports) ? req.body.response.response.transports : [];
    const name = String(req.body.name ?? "Passkey").trim().slice(0, 80) || "Passkey";
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into admin_passkeys(admin_id, credential_id, public_key, counter, transports, device_type, backed_up, name)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [req.admin.sub, credential.id, Buffer.from(credential.publicKey), credential.counter, JSON.stringify(transports), credentialDeviceType, credentialBackedUp, name],
      );
      const adminState = await client.query("update admins set passkey_enrolled_at = coalesce(passkey_enrolled_at, now()) where id = $1 returning totp_enabled_at", [req.admin.sub]);
      if (req.admin.enrollmentOnly && adminState.rows[0]?.totp_enabled_at) {
        await client.query("update auth_sessions set admin_enrollment_only = false, expires_at = now() + interval '8 hours', idle_expires_at = now() + interval '30 minutes' where id = $1 and admin_id = $2 and revoked_at is null", [req.admin.sessionId, req.admin.sub]);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      if (error.code === "23505") { res.status(409).json({ error: "This passkey is already registered" }); return; }
      throw error;
    } finally { client.release(); }
    await writeSecurityEvent(req, "admin.passkey_registered", { adminId: req.admin.sub }, { passkeyId: credential.id });
    clearAuthAttempts(req);
    res.json({ verified: true, enrolled: true });
  } catch (error) { next(error); }
});

app.get("/api/admin/auth/passkeys", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query("select id, name, device_type, backed_up, created_at, last_used_at from admin_passkeys where admin_id = $1 order by created_at", [req.admin.sub]);
    res.json({ passkeys: rows });
  } catch (error) { next(error); }
});

app.delete("/api/admin/auth/passkeys/:id", requireAdmin, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select id from admins where id = $1 for update", [req.admin.sub]);
      const { rows } = await client.query("select id from admin_passkeys where id = $1 and admin_id = $2", [req.params.id, req.admin.sub]);
      if (!rows[0]) { await client.query("rollback"); res.status(404).json({ error: "Passkey not found" }); return; }
      const { rows: countRows } = await client.query("select count(*)::int as count from admin_passkeys where admin_id = $1", [req.admin.sub]);
      if (countRows[0].count <= 1) { await client.query("rollback"); res.status(400).json({ error: "Register another passkey before removing this one" }); return; }
      await client.query("delete from admin_passkeys where id = $1", [req.params.id]);
      await client.query("commit");
    } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
    finally { client.release(); }
    await writeSecurityEvent(req, "admin.passkey_removed", { adminId: req.admin.sub });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get("/api/admin/auth/enrollment/status", requireSecurityEnrollment, async (req, res, next) => {
  try {
    const { rows } = await query("select passkey_enrolled_at, totp_enabled_at, exists(select 1 from admin_passkeys p where p.admin_id = admins.id) as has_passkey from admins where id = $1", [req.admin.sub]);
    if (!rows[0]) { res.status(404).json({ error: "Admin account not found" }); return; }
    res.json({ passkeyEnrolled: Boolean(rows[0].passkey_enrolled_at && rows[0].has_passkey), totpEnabled: Boolean(rows[0].totp_enabled_at) });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/totp/setup", requireSecurityEnrollment, async (req, res, next) => {
  try {
    const secret = randomTotpSecret();
    const ciphertext = encryptTotpSecret(secret);
    const { rows } = await query(
      "update admins set totp_secret_ciphertext = $2, totp_enabled_at = null, totp_last_counter = -1 where id = $1 and totp_enabled_at is null returning email",
      [req.admin.sub, ciphertext],
    );
    if (!rows[0]) { res.status(409).json({ error: "TOTP is already enabled. Disable it before setting up a new authenticator." }); return; }
    await writeSecurityEvent(req, "admin.totp_setup_started", { adminId: req.admin.sub });
    res.json({ secret, otpauthUrl: makeOtpAuthUrl(secret, rows[0].email) });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/totp/verify", rateLimitAuth, requireSecurityEnrollment, async (req, res, next) => {
  try {
    const { rows } = await query("select totp_secret_ciphertext, totp_enabled_at from admins where id = $1", [req.admin.sub]);
    if (!rows[0]?.totp_secret_ciphertext || rows[0].totp_enabled_at) { res.status(400).json({ error: "Start TOTP setup before verifying a code" }); return; }
    const secret = decryptTotpSecret(rows[0].totp_secret_ciphertext);
    const counter = verifyTotp(secret, req.body.code);
    if (counter === null) { res.status(400).json({ error: "The authenticator code is invalid or expired" }); return; }
    const codes = createRecoveryCodes();
    const client = await pool.connect();
    try {
      await client.query("begin");
      const enabled = await client.query("update admins set totp_enabled_at = now(), totp_last_counter = $2 where id = $1 and totp_enabled_at is null returning id", [req.admin.sub, counter]);
      if (!enabled.rowCount) {
        await client.query("rollback");
        res.status(409).json({ error: "Authenticator setup changed. Start setup again." });
        return;
      }
      for (const code of codes) {
        await client.query("insert into admin_totp_recovery_codes(admin_id, code_hash) values ($1, $2)", [req.admin.sub, hashRecoveryCode(code)]);
      }
      if (req.admin.enrollmentOnly) {
        await client.query("update auth_sessions set admin_enrollment_only = false, expires_at = now() + interval '8 hours', idle_expires_at = now() + interval '30 minutes' where id = $1 and admin_id = $2 and revoked_at is null", [req.admin.sessionId, req.admin.sub]);
      }
      await client.query("commit");
    } catch (error) { await client.query("rollback").catch(() => {}); throw error; }
    finally { client.release(); }
    await writeSecurityEvent(req, "admin.totp_enabled", { adminId: req.admin.sub });
    clearAuthAttempts(req);
    res.json({ enabled: true, recoveryCodes: codes });
  } catch (error) { next(error); }
});

app.get("/api/admin/auth/totp/status", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query("select totp_enabled_at from admins where id = $1", [req.admin.sub]);
    const { rows: recovery } = await query("select count(*)::int as remaining from admin_totp_recovery_codes where admin_id = $1 and used_at is null", [req.admin.sub]);
    res.json({ enabled: Boolean(rows[0]?.totp_enabled_at), recoveryCodesRemaining: recovery[0]?.remaining ?? 0 });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/totp/fallback", rateLimitAuth, async (req, res, next) => {
  try {
    const challenge = String(req.body.challenge ?? "");
    const code = String(req.body.code ?? "");
    const { rows: challenges } = await query(
      `update admin_totp_challenges set consumed_at = now()
       where token_hash = $1 and consumed_at is null and expires_at > now() returning admin_id`,
      [resetTokenHash(challenge)],
    );
    if (!challenges[0]) { res.status(401).json({ error: "MFA challenge is invalid or expired" }); return; }
    const { rows } = await query("select id, name, email, role, totp_secret_ciphertext from admins where id = $1 and totp_enabled_at is not null and passkey_enrolled_at is not null and exists(select 1 from admin_passkeys p where p.admin_id = admins.id)", [challenges[0].admin_id]);
    const adminRow = rows[0];
    if (!adminRow) { res.status(401).json({ error: "MFA verification failed" }); return; }
    let accepted = false;
    const secret = decryptTotpSecret(adminRow.totp_secret_ciphertext);
    const counter = verifyTotp(secret, code);
    if (counter !== null) {
      const { rowCount } = await query("update admins set totp_last_counter = $2 where id = $1 and totp_last_counter < $2", [adminRow.id, counter]);
      accepted = rowCount === 1;
    } else if (/^[a-f0-9-]{16,40}$/i.test(code)) {
      const { rowCount } = await query(
        "update admin_totp_recovery_codes set used_at = now() where admin_id = $1 and code_hash = $2 and used_at is null",
        [adminRow.id, hashRecoveryCode(code)],
      );
      accepted = rowCount === 1;
    }
    if (!accepted) {
      await writeSecurityEvent(req, "admin.totp_fallback_failed", { adminId: adminRow.id });
      res.status(401).json({ error: "MFA verification failed" });
      return;
    }
    const admin = publicAdmin(adminRow);
    await createBrowserSession(req, res, { adminId: admin.id });
    await writeSecurityEvent(req, "admin.totp_fallback_succeeded", { adminId: admin.id });
    clearAuthAttempts(req);
    res.json(authResponse(req, { admin }, signAdminToken(admin)));
  } catch (error) { next(error); }
});

app.get("/api/admin/auth/me", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query("select id, name, email, role, passkey_enrolled_at, totp_enabled_at from admins where id = $1", [req.admin.sub]);
    if (!rows[0]) {
      res.status(404).json({ error: "Admin account not found" });
      return;
    }

    res.json({ admin: { ...publicAdmin(rows[0]), passkeyEnrolled: Boolean(rows[0].passkey_enrolled_at), totpEnabled: Boolean(rows[0].totp_enabled_at) } });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/auth/credentials", rateLimitAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!req.admin.sessionId) { res.status(401).json({ error: "Sign in again before changing account credentials" }); return; }
    const name = String(req.body.name ?? "").trim().slice(0, 120);
    const email = normalizeEmail(req.body.email);
    const newPassword = String(req.body.newPassword ?? "");
    const currentPassword = String(req.body.currentPassword ?? "");
    if (!name || !validEmail(email)) { res.status(400).json({ error: "Enter a name and valid email address" }); return; }
    if (newPassword && (newPassword.length < 14 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword))) {
      res.status(400).json({ error: "Use a password of at least 14 characters with uppercase, lowercase, and a number" }); return;
    }
    const { rows } = await query("select password_hash from admins where id = $1", [req.admin.sub]);
    if (!rows[0] || !currentPassword || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
      res.status(401).json({ error: "Current password is invalid" }); return;
    }
    const passwordHash = newPassword ? await hashPassword(newPassword) : rows[0].password_hash;
    const updated = await query(
      "update admins set name = $2, email = $3, password_hash = $4, updated_at = now() where id = $1 returning id, name, email, role",
      [req.admin.sub, name, email, passwordHash],
    );
    await query("update auth_sessions set revoked_at = now() where admin_id = $1 and id <> $2 and revoked_at is null", [req.admin.sub, req.admin.sessionId]);
    await writeSecurityEvent(req, "admin.credentials_changed", { adminId: req.admin.sub }, { nameChanged: true, emailChanged: email !== req.admin.email, passwordChanged: Boolean(newPassword) });
    res.json({ admin: publicAdmin(updated.rows[0]) });
  } catch (error) {
    if (error.code === "23505") { res.status(409).json({ error: "That email address is already assigned to an admin account" }); return; }
    next(error);
  }
});

app.get("/api/admin/auth/sessions", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select id, created_at, last_seen_at, expires_at, idle_expires_at, ip_address, user_agent,
        (id = $2) as current
       from auth_sessions where admin_id = $1 and revoked_at is null and expires_at > now() and idle_expires_at > now()
       order by last_seen_at desc`,
      [req.admin.sub, req.admin.sessionId ?? null],
    );
    res.json({ sessions: rows });
  } catch (error) { next(error); }
});

app.delete("/api/admin/auth/sessions/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) { res.status(400).json({ error: "Invalid session id" }); return; }
    const result = await query("update auth_sessions set revoked_at = now() where id = $1 and admin_id = $2 and revoked_at is null", [req.params.id, req.admin.sub]);
    res.json({ ok: true, revoked: result.rowCount > 0 });
  } catch (error) { next(error); }
});

app.post("/api/admin/auth/session/exchange", requireAdmin, async (req, res, next) => {
  try {
    if (req.admin.sessionId) {
      res.json({ ok: true });
      return;
    }

    const { rows } = await query("select id from admins where id = $1", [req.admin.sub]);
    if (!rows[0]) {
      res.status(401).json({ error: "Invalid or expired admin session" });
      return;
    }
    await createBrowserSession(req, res, { adminId: rows[0].id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/logout", async (req, res, next) => {
  try {
    const token = parseCookies(req)[adminCookieName];
    if (token) {
      await query(
        "update auth_sessions set revoked_at = now() where token_hash = $1 and revoked_at is null",
        [crypto.createHash("sha256").update(token).digest("hex")],
      );
      await writeSecurityEvent(req, "admin.logout");
    }
    clearSessionCookie(res, true);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/logout-all", requireAdmin, async (req, res, next) => {
  try {
    await query("update auth_sessions set revoked_at = now() where admin_id = $1 and revoked_at is null", [req.admin.sub]);
    await writeSecurityEvent(req, "admin.logout_all", { adminId: req.admin.sub });
    clearSessionCookie(res, true);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/auth/bootstrap", async (_req, res, next) => {
  res.json({ needsAdmin: false, provisioning: "protected_cli" });
});

app.get("/api/settings", async (_req, res, next) => {
  try {
    const { rows } = await query("select value from store_settings where key = 'storefront'");
    res.json({ settings: settingPayload(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/settings", requireSuperAdmin, async (req, res, next) => {
  try {
    const current = await query("select value from store_settings where key = 'storefront'");
    const nextSettings = {
      ...settingPayload(current.rows[0]),
      storeName: String(req.body.storeName ?? defaultStoreSettings.storeName).trim() || defaultStoreSettings.storeName,
      supportPhone: String(req.body.supportPhone ?? "").trim(),
      whatsappNumber: String(req.body.whatsappNumber ?? "").replace(/[^\d]/g, ""),
      defaultWarranty: String(req.body.defaultWarranty ?? "").trim(),
      shippingNote: String(req.body.shippingNote ?? "").trim(),
      showFeaturedProducts: Boolean(req.body.showFeaturedProducts),
      showWarrantyStrip: Boolean(req.body.showWarrantyStrip),
      showLowStockUrgency: Boolean(req.body.showLowStockUrgency),
      heroEyebrow: String(req.body.heroEyebrow ?? "").trim(),
      heroTitle: String(req.body.heroTitle ?? "").trim(),
      heroDescription: String(req.body.heroDescription ?? "").trim(),
    };

    const { rows } = await query(
      `
        insert into store_settings (key, value, updated_at)
        values ('storefront', $1, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
        returning value
      `,
      [JSON.stringify(nextSettings)],
    );

    res.json({ settings: settingPayload(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/register", rateLimitAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");
    const role = req.body.role === "super_admin" ? "super_admin" : "admin";

    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }

    if (!validEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    if (!strongPassword(password)) {
      res.status(400).json({ error: "Password must be at least 10 characters and include uppercase, lowercase, and a number" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      "insert into admins (name, email, password_hash, role) values ($1, $2, $3, $4) returning id, name, email, role",
      [name, email, passwordHash, role],
    );
    const admin = publicAdmin(rows[0]);
    await writeSecurityEvent(req, "admin.registered", { adminId: admin.id }, { role });
    res.status(201).json({ admin, requiresPasskeyEnrollment: true, message: "Account created. The new administrator must sign in and enroll a passkey and authenticator before dashboard access." });
  } catch (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "An admin with that email already exists" });
      return;
    }

    next(error);
  }
});

app.get("/api/admin/accounts", requireSuperAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query("select id, name, email, role, created_at from admins order by created_at desc");
    res.json({ admins: rows.map(publicAdmin) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/accounts/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.admin.sub) {
      res.status(400).json({ error: "You cannot delete your own admin account" });
      return;
    }

    const { rowCount } = await query("delete from admins where id = $1", [req.params.id]);
    if (!rowCount) {
      res.status(404).json({ error: "Admin account not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use("/api/admin", (req, res, next) => {
  if (req.path.startsWith("/auth/password-reset")) {
    next();
    return;
  }

  requireAdmin(req, res, next);
});

app.post("/api/admin/categories", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const slug = slugify(req.body.slug || name);

    if (!name || !slug) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }

    const { rows } = await query(
      `
        insert into categories (id, name, slug, description, sort_order)
        values ($1, $2, $3, $4, $5)
        on conflict (id) do update set
          name = excluded.name,
          slug = excluded.slug,
          description = excluded.description,
          sort_order = excluded.sort_order
        returning *
      `,
      [
        `cat-${slug}`,
        name,
        slug,
        String(req.body.description ?? "").trim(),
        Number(req.body.sort_order ?? 99),
      ],
    );

    res.status(201).json({ category: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/categories/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id ?? "").trim();
    const name = String(req.body.name ?? "").trim();
    const slug = slugify(req.body.slug || name);

    if (!id || !name || !slug) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }

    const { rows } = await query(
      `
        update categories
        set
          name = $2,
          slug = $3,
          description = $4,
          sort_order = coalesce($5, sort_order)
        where id = $1
        returning *
      `,
      [
        id,
        name,
        slug,
        String(req.body.description ?? "").trim(),
        req.body.sort_order === undefined ? null : Number(req.body.sort_order),
      ],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({ category: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/categories/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id ?? "").trim();

    if (!id) {
      res.status(400).json({ error: "Category id is required" });
      return;
    }

    await query(
      `
        update products
        set category_id = null, subcategory_id = null, updated_at = now()
        where category_id = $1
          or subcategory_id in (select id from subcategories where category_id = $1)
      `,
      [id],
    );

    const { rowCount } = await query("delete from categories where id = $1", [id]);

    if (!rowCount) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", async (req, res, next) => {
  try {
    const categoryId = String(req.query.category_id ?? "").trim();
    const subcategoryId = String(req.query.subcategory_id ?? "").trim();
    const featuredOnly = String(req.query.featured ?? "") === "true";
    const params = [];
    const filters = [];

    if (categoryId) {
      params.push(categoryId);
      filters.push(`category_id = $${params.length}`);
    }

    if (subcategoryId) {
      params.push(subcategoryId);
      filters.push(`subcategory_id = $${params.length}`);
    }

    if (featuredOnly) {
      filters.push("is_featured = true");
    }

    const where = filters.length ? `where ${filters.join(" and ")}` : "";
    const { rows } = await query(
      `
        select *
        from products
        ${where}
        order by is_featured desc, updated_at desc, name asc
      `,
      params,
    );

    res.json({ products: rows.map(productPayload) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:slug", async (req, res, next) => {
  try {
    const { rows } = await query("select * from products where slug = $1", [req.params.slug]);

    if (!rows[0]) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product: productPayload(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:identifier/reviews", async (req, res, next) => {
  try {
    const productLookup = await query("select id from products where id = $1 or slug = $1", [req.params.identifier]);
    if (!productLookup.rows[0]) {
      res.json({ reviews: [] });
      return;
    }

    const { rows } = await query(
      `
        select id, product_id, customer_name, rating, comment, is_featured, created_at
        from reviews
        where product_id = $1 and status = 'approved'
        order by is_featured desc, created_at desc
      `,
      [productLookup.rows[0].id],
    );

    res.json({ reviews: rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/products/:identifier/reviews", requireAuth, async (req, res, next) => {
  try {
    const rating = Number(req.body.rating ?? 5);
    const comment = String(req.body.comment ?? "").trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Choose a rating from 1 to 5" });
      return;
    }

    if (comment.length < 8) {
      res.status(400).json({ error: "Review comment must be at least 8 characters" });
      return;
    }

    const productLookup = await query("select id from products where id = $1 or slug = $1", [req.params.identifier]);
    if (!productLookup.rows[0]) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const userLookup = await query("select id, first_name, last_name from users where id = $1", [req.auth.sub]);
    if (!userLookup.rows[0]) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const customerName = `${userLookup.rows[0].first_name} ${userLookup.rows[0].last_name}`.trim();
    const { rows } = await query(
      `
        insert into reviews (product_id, user_id, customer_name, rating, comment, status)
        values ($1, $2, $3, $4, $5, 'pending')
        returning *
      `,
      [productLookup.rows[0].id, req.auth.sub, customerName, rating, comment],
    );

    res.status(201).json({ review: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/products", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      select *
      from products
      order by updated_at desc, name asc
    `);

    res.json({ products: rows.map(productPayload) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/products", async (req, res, next) => {
  try {
    const name = String(req.body.name ?? "").trim();
    const slug = slugify(req.body.slug || name);
    const id = slug ? `prod-${slug}` : "";

    if (!name || !slug) {
      res.status(400).json({ error: "Product name is required" });
      return;
    }

    const { rows } = await query(
      `
        insert into products (
          id, slug, name, description, brand, price, currency, image_url, stock,
          discount_price, condition, specifications, warranty, status,
          category_id, subcategory_id, product_type, is_featured
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        returning *
      `,
      [
        id,
        slug,
        name,
        String(req.body.description ?? "").trim() || null,
        String(req.body.brand ?? "").trim() || null,
        Number(req.body.price ?? 0),
        String(req.body.currency ?? "USD").trim() || "USD",
        String(req.body.image_url ?? "").trim() || null,
        Number(req.body.stock ?? 0),
        req.body.discount_price ? Number(req.body.discount_price) : null,
        String(req.body.condition ?? "New").trim() || "New",
        String(req.body.specifications ?? "").trim() || null,
        String(req.body.warranty ?? "").trim() || null,
        String(req.body.status ?? "in_stock").trim() || "in_stock",
        String(req.body.category_id ?? "").trim() || null,
        String(req.body.subcategory_id ?? "").trim() || null,
        String(req.body.product_type ?? "").trim() || null,
        Boolean(req.body.is_featured),
      ],
    );

    res.status(201).json({ product: productPayload(rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "A product with this name or slug already exists" });
      return;
    }

    next(error);
  }
});

app.delete("/api/admin/products/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    await query("delete from products where id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/products/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        update products
        set
          name = coalesce($2, name),
          description = coalesce($3, description),
          brand = coalesce($4, brand),
          price = coalesce($5, price),
          currency = coalesce($6, currency),
          image_url = coalesce($7, image_url),
          stock = coalesce($8, stock),
          discount_price = coalesce($9, discount_price),
          condition = coalesce($10, condition),
          specifications = coalesce($11, specifications),
          warranty = coalesce($12, warranty),
          status = coalesce($13, status),
          category_id = coalesce($14, category_id),
          subcategory_id = coalesce($15, subcategory_id),
          product_type = coalesce($16, product_type),
          is_featured = coalesce($17, is_featured),
          updated_at = now()
        where id = $1
        returning *
      `,
      [
        req.params.id,
        req.body.name === undefined ? null : String(req.body.name).trim(),
        req.body.description === undefined ? null : String(req.body.description).trim() || null,
        req.body.brand === undefined ? null : String(req.body.brand).trim() || null,
        req.body.price === undefined ? null : Number(req.body.price),
        req.body.currency === undefined ? null : String(req.body.currency).trim() || "USD",
        req.body.image_url === undefined ? null : String(req.body.image_url).trim() || null,
        req.body.stock === undefined ? null : Number(req.body.stock),
        req.body.discount_price ? Number(req.body.discount_price) : null,
        req.body.condition === undefined ? null : String(req.body.condition).trim() || "New",
        req.body.specifications === undefined ? null : String(req.body.specifications).trim() || null,
        req.body.warranty === undefined ? null : String(req.body.warranty).trim() || null,
        req.body.status === undefined ? null : String(req.body.status).trim() || "in_stock",
        req.body.category_id === undefined ? null : String(req.body.category_id).trim() || null,
        req.body.subcategory_id === undefined ? null : String(req.body.subcategory_id).trim() || null,
        req.body.product_type === undefined ? null : String(req.body.product_type).trim() || null,
        req.body.is_featured === undefined ? null : Boolean(req.body.is_featured),
      ],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product: productPayload(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/products/bulk", async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const action = String(req.body.action ?? "").trim();

    if (!ids.length || !action) {
      res.status(400).json({ error: "Product IDs and action are required" });
      return;
    }

    if (action === "delete") {
      if (req.admin.role !== "super_admin") {
        res.status(403).json({ error: "Super admin access required" });
        return;
      }

      await query("delete from products where id = any($1::text[])", [ids]);
    } else if (action === "featured") {
      await query("update products set is_featured = true, updated_at = now() where id = any($1::text[])", [ids]);
    } else if (action === "stock") {
      await query("update products set stock = $2, status = case when $2 <= 0 then 'out_of_stock' else status end, updated_at = now() where id = any($1::text[])", [ids, Number(req.body.stock ?? 0)]);
    } else if (action === "category") {
      await query("update products set category_id = $2, updated_at = now() where id = any($1::text[])", [ids, String(req.body.category_id ?? "") || null]);
    } else {
      res.status(400).json({ error: "Unsupported bulk action" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/uploads", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ imageUrl });
});

app.get("/api/admin/notifications", async (_req, res, next) => {
  try {
    const [deliveryRequests, newInquiries, pendingReviews, lowStock] = await Promise.all([
      query(`
        select id, product_name, customer_name, customer_phone, message, created_at
        from inquiries
        where source = 'delivery' and status <> 'completed'
        order by created_at desc
        limit 8
      `),
      query(`
        select id, product_name, customer_name, customer_phone, message, created_at
        from inquiries
        where source <> 'delivery' and status = 'new'
        order by created_at desc
        limit 8
      `),
      query(`
        select id, customer_name, rating, comment, created_at
        from reviews
        where status = 'pending'
        order by created_at desc
        limit 8
      `),
      query(`
        select id, name, stock, updated_at
        from products
        where stock <= 3 or status = 'out_of_stock'
        order by stock asc, updated_at desc
        limit 8
      `),
    ]);

    const notifications = [
      ...deliveryRequests.rows.map((row) => ({
        id: `delivery-${row.id}`,
        type: "delivery",
        title: "Delivery request",
        body: `${row.customer_name || "Customer"} requested delivery for ${row.product_name}.`,
        severity: "critical",
        created_at: row.created_at,
        href: "/admin/inquiries?source=delivery",
      })),
      ...newInquiries.rows.map((row) => ({
        id: `inquiry-${row.id}`,
        type: "inquiry",
        title: "New customer inquiry",
        body: `${row.customer_name || "Customer"} asked about ${row.product_name}.`,
        severity: "info",
        created_at: row.created_at,
        href: "/admin/inquiries",
      })),
      ...pendingReviews.rows.map((row) => ({
        id: `review-${row.id}`,
        type: "review",
        title: "Review awaiting moderation",
        body: `${row.customer_name} left a ${row.rating}-star review.`,
        severity: "info",
        created_at: row.created_at,
        href: "/admin/reviews",
      })),
      ...lowStock.rows.map((row) => ({
        id: `stock-${row.id}`,
        type: "stock",
        title: row.stock <= 0 ? "Product out of stock" : "Stock running low",
        body: `${row.name} has ${row.stock} units left.`,
        severity: row.stock <= 0 ? "critical" : "warning",
        created_at: row.updated_at,
        href: "/admin/inventory",
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/inquiries", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      select *
      from inquiries
      order by created_at desc
    `);

    res.json({ inquiries: rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/reviews", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      select reviews.*, products.name as product_name
      from reviews
      left join products on products.id = reviews.product_id
      order by reviews.created_at desc
    `);
    res.json({ reviews: rows });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/reviews/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `
        update reviews
        set status = coalesce($2, status), is_featured = coalesce($3, is_featured)
        where id = $1
        returning *
      `,
      [
        req.params.id,
        req.body.status === undefined ? null : String(req.body.status),
        req.body.is_featured === undefined ? null : Boolean(req.body.is_featured),
      ],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json({ review: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/inquiries/:id", async (req, res, next) => {
  try {
    const status = String(req.body.status ?? "contacted").trim();
    const { rows } = await query(
      "update inquiries set status = $2 where id = $1 returning *",
      [req.params.id, status],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Inquiry not found" });
      return;
    }

    res.json({ inquiry: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/inquiries", async (req, res, next) => {
  try {
    const productName = String(req.body.productName ?? "").trim();
    const message = String(req.body.message ?? "").trim();
    const requestedProductId = String(req.body.productId ?? "").trim();
    let productId = null;

    if (!productName || !message) {
      res.status(400).json({ error: "Product name and message are required" });
      return;
    }

    if (requestedProductId) {
      const productLookup = await query("select id from products where id = $1", [requestedProductId]);
      productId = productLookup.rows[0]?.id ?? null;
    }

    const { rows } = await query(
      `
        insert into inquiries (product_id, product_name, customer_name, customer_phone, source, message)
        values ($1, $2, $3, $4, $5, $6)
        returning *
      `,
      [
        productId,
        productName,
        String(req.body.customerName ?? "").trim() || null,
        String(req.body.customerPhone ?? "").trim() || null,
        String(req.body.source ?? "whatsapp").trim() || "whatsapp",
        message,
      ],
    );

    res.status(201).json({ inquiry: rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", rateLimitAuth, async (req, res, next) => {
  try {
    const firstName = String(req.body.firstName ?? "").trim();
    const lastName = String(req.body.lastName ?? "").trim();
    const email = normalizeEmail(req.body.email);
    const phone = String(req.body.phone ?? "").trim() || null;
    const password = String(req.body.password ?? "");

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: "First name, last name, email, and password are required" });
      return;
    }

    if (!validEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    if (!strongPassword(password)) {
      res.status(400).json({ error: "Password must be at least 10 characters and include uppercase, lowercase, and a number" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `
        insert into users (first_name, last_name, email, phone, password_hash)
        values ($1, $2, $3, $4, $5)
        returning id, first_name, last_name, email, phone
      `,
      [firstName, lastName, email, phone, passwordHash],
    );

    const user = publicUser(rows[0]);
    await createBrowserSession(req, res, { userId: user.id });
    await writeSecurityEvent(req, "customer.registered", { userId: user.id });
    clearAuthAttempts(req);
    res.status(201).json(authResponse(req, { user }, signToken(user)));
  } catch (error) {
    if (error.code === "23505") {
      res.status(409).json({ error: "An account with that email already exists" });
      return;
    }

    next(error);
  }
});

app.post("/api/auth/google", rateLimitAuth, async (req, res, next) => {
  try {
    const rawCredential = String(req.body.credential ?? "");
    const payload = await verifyGoogleCredential(rawCredential);
    const configuredClientId = String(process.env.GOOGLE_CLIENT_ID ?? "").trim();

    if (!configuredClientId) {
      res.status(503).json({ error: "Google sign-in is not configured" });
      return;
    }

    if (
      !payload?.sub ||
      payload.aud !== configuredClientId ||
      !payload.email ||
      ![true, "true"].includes(payload.email_verified)
    ) {
      res.status(401).json({ error: "Google sign-in could not be verified" });
      return;
    }

    const email = normalizeEmail(payload.email);
    const name = String(payload.name ?? email.split("@")[0]).trim();
    const [firstName = "Google", ...lastParts] = name.split(/\s+/);
    const lastName = lastParts.join(" ") || "User";

    const { rows } = await query(
      `
        insert into users (first_name, last_name, email, google_sub)
        values ($1, $2, $3, $4)
        on conflict (email) do update set
          google_sub = coalesce(users.google_sub, excluded.google_sub),
          updated_at = now()
        returning id, first_name, last_name, email, phone
      `,
      [firstName, lastName, email, String(payload.sub)],
    );

    const user = publicUser(rows[0]);
    await createBrowserSession(req, res, { userId: user.id });
    await writeSecurityEvent(req, "customer.google_login_succeeded", { userId: user.id });
    clearAuthAttempts(req);
    res.json(authResponse(req, { user }, signToken(user)));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (!validEmail(email)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { rows } = await query(
      "select id, first_name, last_name, email, phone, password_hash from users where email = $1",
      [email],
    );
    const userRow = rows[0];
    const passwordHash = userRow?.password_hash ?? dummyPasswordHash;

    if (!userRow || !(await verifyPassword(password, passwordHash))) {
      await writeSecurityEvent(req, "customer.login_failed");
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (needsPasswordRehash(userRow.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await query("update users set password_hash = $2, updated_at = now() where id = $1", [userRow.id, upgradedHash]);
    }

    const user = publicUser(userRow);
    await createBrowserSession(req, res, { userId: user.id });
    await writeSecurityEvent(req, "customer.login_succeeded", { userId: user.id });
    clearAuthAttempts(req);
    res.json(authResponse(req, { user }, signToken(user)));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/password-reset/request", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const { rows } = await query("select id from users where email = $1", [email]);
    const token = crypto.randomBytes(32).toString("hex");
    if (rows[0]) {
      await query(
        `
          insert into password_reset_tokens (account_type, account_id, token_hash, expires_at)
          values ('user', $1, $2, now() + interval '30 minutes')
        `,
        [rows[0].id, resetTokenHash(token)],
      );
    }

    await writeSecurityEvent(req, "customer.password_reset_requested");

    res.json({
      ok: true,
      message: "If an account exists, a reset token has been created.",
      resetToken: exposeDevResetTokens && rows[0] ? token : undefined,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/password-reset/confirm", rateLimitAuth, async (req, res, next) => {
  try {
    const token = String(req.body.token ?? "").trim();
    const password = String(req.body.password ?? "");

    if (!token || !password) {
      res.status(400).json({ error: "Reset token and new password are required" });
      return;
    }

    if (!strongPassword(password)) {
      res.status(400).json({ error: "Password must be at least 10 characters and include uppercase, lowercase, and a number" });
      return;
    }

    const { rows } = await query(
      `
        select id, account_id
        from password_reset_tokens
        where account_type = 'user'
          and token_hash = $1
          and used_at is null
          and expires_at > now()
        order by created_at desc
        limit 1
      `,
      [resetTokenHash(token)],
    );

    if (!rows[0]) {
      res.status(400).json({ error: "Reset token is invalid or expired" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const { rows: changedRows } = await query(
      `
        with consumed as (
          update password_reset_tokens
          set used_at = now()
          where id = $1 and account_type = 'user' and used_at is null and expires_at > now()
          returning account_id
        ), changed as (
          update users
          set password_hash = $2, updated_at = now()
          from consumed
          where users.id = consumed.account_id
          returning users.id
        ), revoked as (
          update auth_sessions set revoked_at = now()
          where user_id in (select id from changed) and revoked_at is null
          returning id
        )
        select id from changed
      `,
      [rows[0].id, passwordHash],
    );
    if (!changedRows.length) {
      res.status(400).json({ error: "Reset token is invalid or expired" });
      return;
    }
    await writeSecurityEvent(req, "customer.password_reset_completed", { userId: changedRows[0].id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/password-reset/request", rateLimitAuth, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const { rows } = await query("select id from admins where email = $1", [email]);
    const token = crypto.randomBytes(32).toString("hex");
    if (rows[0]) {
      await query(
        `
          insert into password_reset_tokens (account_type, account_id, token_hash, expires_at)
          values ('admin', $1, $2, now() + interval '30 minutes')
        `,
        [rows[0].id, resetTokenHash(token)],
      );
    }

    await writeSecurityEvent(req, "admin.password_reset_requested", rows[0] ? { adminId: rows[0].id } : {});

    res.json({
      ok: true,
      message: "If an admin account exists, a reset token has been created.",
      resetToken: exposeDevResetTokens && rows[0] ? token : undefined,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/auth/password-reset/confirm", rateLimitAuth, async (req, res, next) => {
  try {
    const token = String(req.body.token ?? "").trim();
    const password = String(req.body.password ?? "");

    if (!token || !password) {
      res.status(400).json({ error: "Reset token and new password are required" });
      return;
    }

    if (!strongPassword(password)) {
      res.status(400).json({ error: "Password must be at least 10 characters and include uppercase, lowercase, and a number" });
      return;
    }

    const { rows } = await query(
      `
        select id, account_id
        from password_reset_tokens
        where account_type = 'admin'
          and token_hash = $1
          and used_at is null
          and expires_at > now()
        order by created_at desc
        limit 1
      `,
      [resetTokenHash(token)],
    );

    if (!rows[0]) {
      res.status(400).json({ error: "Reset token is invalid or expired" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const { rows: changedRows } = await query(
      `
        with consumed as (
          update password_reset_tokens
          set used_at = now()
          where id = $1 and account_type = 'admin' and used_at is null and expires_at > now()
          returning account_id
        ), changed as (
          update admins
          set password_hash = $2, updated_at = now()
          from consumed
          where admins.id = consumed.account_id
          returning admins.id
        ), revoked as (
          update auth_sessions set revoked_at = now()
          where admin_id in (select id from changed) and revoked_at is null
          returning id
        )
        select id from changed
      `,
      [rows[0].id, passwordHash],
    );
    if (!changedRows.length) {
      res.status(400).json({ error: "Reset token is invalid or expired" });
      return;
    }
    await writeSecurityEvent(req, "admin.password_reset_completed", { adminId: changedRows[0].id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      "select id, first_name, last_name, email, phone from users where id = $1",
      [req.auth.sub],
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({ user: publicUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/sessions", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select id, created_at, last_seen_at, expires_at, idle_expires_at, ip_address, user_agent,
        (id = $2) as current
       from auth_sessions where user_id = $1 and revoked_at is null and expires_at > now() and idle_expires_at > now()
       order by last_seen_at desc`,
      [req.auth.sub, req.auth.sessionId ?? null],
    );
    res.json({ sessions: rows });
  } catch (error) { next(error); }
});

app.delete("/api/auth/sessions/:id", requireAuth, async (req, res, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) { res.status(400).json({ error: "Invalid session id" }); return; }
    const result = await query("update auth_sessions set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null", [req.params.id, req.auth.sub]);
    res.json({ ok: true, revoked: result.rowCount > 0 });
  } catch (error) { next(error); }
});

app.post("/api/auth/session/exchange", requireAuth, async (req, res, next) => {
  try {
    if (req.auth.sessionId) {
      res.json({ ok: true });
      return;
    }
    const { rows } = await query("select id from users where id = $1", [req.auth.sub]);
    if (!rows[0]) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    await createBrowserSession(req, res, { userId: rows[0].id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = parseCookies(req)[customerCookieName];
    if (token) {
      await query(
        "update auth_sessions set revoked_at = now() where token_hash = $1 and revoked_at is null",
        [crypto.createHash("sha256").update(token).digest("hex")],
      );
      await writeSecurityEvent(req, "customer.logout");
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout-all", requireAuth, async (req, res, next) => {
  try {
    await query("update auth_sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [req.auth.sub]);
    await writeSecurityEvent(req, "customer.logout_all", { userId: req.auth.sub });
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : error.message ?? "Internal server error";

  res.status(500).json({ error: message });
});

async function ensureSchema() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      console.warn("No schema.sql found, skipping schema initialization");
      return;
    }

    const sql = fs.readFileSync(schemaPath, "utf8");

    // Split into statements and run sequentially to avoid driver multi-statement issues
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await query(stmt);
      } catch (err) {
        // Log and continue — many statements are idempotent (create if not exists / alter)
        console.debug("schema statement failed (continuing):", err.message || err);
      }
    }

    console.log("Database schema ensured from schema.sql");
    await runMigrations();
  } catch (err) {
    console.error("Failed to ensure database schema:", err);
    throw err;
  }
}

async function runMigrations() {
  await query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const migrationsDirectory = path.join(__dirname, "migrations");
  const migrationFiles = fs.readdirSync(migrationsDirectory)
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort();

  for (const name of migrationFiles) {
    const version = name.slice(0, name.indexOf("_"));
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(731024619)");
      const applied = await client.query("select 1 from schema_migrations where version = $1", [version]);
      if (applied.rowCount) {
        await client.query("commit");
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDirectory, name), "utf8");
      const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) await client.query(statement);
      await client.query("insert into schema_migrations (version) values ($1)", [version]);
      await client.query("commit");
      console.log(`Applied database migration ${name}`);
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw new Error(`Database migration ${name} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

(async () => {
  await ensureSchema();

  app.listen(port, () => {
    console.log(`Express API listening on http://localhost:${port}`);
  });
})().catch((error) => {
  console.error("API startup halted because database setup failed:", error.message);
  process.exitCode = 1;
});
