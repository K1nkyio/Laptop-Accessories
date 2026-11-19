import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { hashPassword, needsPasswordRehash, verifyPassword } from "../security/password-hash.js";

test("new passwords use Argon2id and verify correctly", async () => {
  const hash = await hashPassword("SecurePassword42");
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(needsPasswordRehash(hash), false);
  assert.equal(await verifyPassword("SecurePassword42", hash), true);
  assert.equal(await verifyPassword("WrongPassword42", hash), false);
});

test("existing bcrypt hashes remain valid and are marked for upgrade", async () => {
  const hash = await bcrypt.hash("ExistingPassword42", 4);
  assert.equal(await verifyPassword("ExistingPassword42", hash), true);
  assert.equal(needsPasswordRehash(hash), true);
  assert.equal(await verifyPassword("WrongPassword42", hash), false);
});
