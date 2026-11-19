import test from "node:test";
import assert from "node:assert/strict";
import { createRecoveryCodes, decryptTotpSecret, encryptTotpSecret, hashRecoveryCode, totpCode, verifyTotp } from "../security/totp.js";

const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("TOTP matches the RFC 6238 SHA-1 test vector and validates adjacent clock window", () => {
  assert.equal(totpCode(rfcSecret, 1), "287082");
  assert.equal(verifyTotp(rfcSecret, "287082", 59_000), 1);
  assert.equal(verifyTotp(rfcSecret, "bad", 59_000), null);
  assert.equal(verifyTotp(rfcSecret, "000000", 59_000), null);
});

test("TOTP secrets are authenticated-encrypted and recovery codes are one-way hashed", () => {
  const previousKey = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  process.env.ADMIN_MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const encoded = encryptTotpSecret(rfcSecret);
    assert.notEqual(encoded, rfcSecret);
    assert.equal(decryptTotpSecret(encoded), rfcSecret);
    const codes = createRecoveryCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    assert.match(codes[0], /^(?:[A-F0-9]{4}-){7}[A-F0-9]{4}$/);
    assert.notEqual(hashRecoveryCode(codes[0]), codes[0]);
    assert.equal(hashRecoveryCode(codes[0]), hashRecoveryCode(codes[0].toLowerCase()));
  } finally {
    if (previousKey === undefined) delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
    else process.env.ADMIN_MFA_ENCRYPTION_KEY = previousKey;
  }
});
