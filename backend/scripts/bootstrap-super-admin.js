import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { hashPassword } from "../security/password-hash.js";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../.env") });
const { pool } = await import("../db.js");

function hiddenPrompt(label) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this provisioning command from an interactive terminal.");
  }
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = "";
    process.stdout.write(label);
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    const cleanup = () => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      process.stdout.write("\n");
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === "backspace") value = value.slice(0, -1);
      else if (!key.ctrl && !key.meta && character && value.length < 256) value += character;
    };
    stdin.on("keypress", onKeypress);
  });
}

async function applySchemaAndMigrations(client) {
  const schema = fs.readFileSync(path.resolve(here, "../schema.sql"), "utf8");
  await client.query(schema);
  await client.query(`create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);
  const migrationDir = path.resolve(here, "../migrations");
  const files = fs.readdirSync(migrationDir).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
  for (const file of files) {
    const version = file.slice(0, file.indexOf("_"));
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(731024619)");
      const exists = await client.query("select 1 from schema_migrations where version = $1", [version]);
      if (!exists.rowCount) {
        await client.query(fs.readFileSync(path.join(migrationDir, file), "utf8"));
        await client.query("insert into schema_migrations(version) values ($1)", [version]);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  }
}

async function main() {
  const name = (await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Super Admin name: ", (answer) => { rl.close(); resolve(answer.trim()); });
  }));
  const email = (await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Super Admin email: ", (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
  }));
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A name and valid email address are required.");
  const password = await hiddenPrompt("Initial password (input hidden): ");
  const confirmation = await hiddenPrompt("Confirm password (input hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match.");
  if (password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Use at least 14 characters with uppercase, lowercase, and a number.");
  }

  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock(731024620)");
    const adminsTable = await client.query("select to_regclass('public.admins') as table_name");
    if (adminsTable.rows[0].table_name) {
      const existingSuperAdmin = await client.query("select id from admins where role = 'super_admin' limit 1");
      if (existingSuperAdmin.rowCount) throw new Error("Bootstrap refused: a Super Admin already exists and cannot be overwritten.");
    }
    await applySchemaAndMigrations(client);
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(731024620)");
      const existingSuperAdmin = await client.query("select id from admins where role = 'super_admin' limit 1 for update");
      if (existingSuperAdmin.rowCount) throw new Error("Bootstrap refused: a Super Admin already exists and cannot be overwritten.");
      const passwordHash = await hashPassword(password);
      const existingAccount = await client.query("select id from admins where email = $1 for update", [email]);
      if (existingAccount.rowCount) {
        const adminId = existingAccount.rows[0].id;
        await client.query("delete from admin_passkeys where admin_id = $1", [adminId]);
        await client.query("delete from admin_totp_recovery_codes where admin_id = $1", [adminId]);
        await client.query("delete from admin_webauthn_challenges where admin_id = $1", [adminId]);
        await client.query("delete from admin_totp_challenges where admin_id = $1", [adminId]);
        await client.query("update auth_sessions set revoked_at = now() where admin_id = $1 and revoked_at is null", [adminId]);
      }
      const created = existingAccount.rowCount
        ? await client.query("update admins set name = $2, password_hash = $3, role = 'super_admin', passkey_enrolled_at = null, totp_secret_ciphertext = null, totp_enabled_at = null, totp_last_counter = -1, updated_at = now() where id = $1 returning id", [existingAccount.rows[0].id, name, passwordHash])
        : await client.query("insert into admins(name, email, password_hash, role) values ($1, $2, $3, 'super_admin') returning id", [name, email, passwordHash]);
      await client.query(
        "insert into security_audit_logs(admin_id, event_type, metadata) values ($1, 'admin.bootstrap_completed', $2::jsonb)",
        [created.rows[0].id, JSON.stringify({ source: "protected_cli", operation: existingAccount.rowCount ? "promoted_existing_admin" : "created_initial_admin" })],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
    console.log(`Provisioned the Super Admin account for ${email}.`);
    console.log("Next: start the API, open /admin/login, sign in once, and complete passkey enrollment before dashboard access.");
  } finally {
    await client.query("select pg_advisory_unlock(731024620)").catch(() => {});
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end();
  process.exitCode = 1;
});
