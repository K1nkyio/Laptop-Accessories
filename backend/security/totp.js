import crypto from "crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function randomTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) result += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return result;
}

function decodeBase32(value) {
  const normalized = String(value).toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  if (!normalized || /[^A-Z2-7]/.test(normalized)) throw new Error("Invalid TOTP secret");
  let bits = "";
  for (const char of normalized) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function totpCounter(at = Date.now()) {
  return Math.floor(at / 30_000);
}

export function totpCode(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret, candidate, at = Date.now(), window = 1) {
  const code = String(candidate ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return null;
  const current = totpCounter(at);
  for (let offset = -window; offset <= window; offset += 1) {
    const counter = current + offset;
    const expected = totpCode(secret, counter);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return counter;
  }
  return null;
}

function encryptionKey() {
  const encoded = process.env.ADMIN_MFA_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ADMIN_MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function assertTotpEncryptionKey() {
  encryptionKey();
}

export function encryptTotpSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(encoded) {
  const [ivPart, tagPart, dataPart] = String(encoded ?? "").split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Invalid encrypted TOTP secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]).toString("utf8");
}

export function makeOtpAuthUrl(secret, email) {
  const label = encodeURIComponent(`TechHub Admin:${email}`);
  const params = new URLSearchParams({ secret, issuer: "TechHub Admin", algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(16).toString("hex").toUpperCase().match(/.{1,4}/g).join("-"));
}

export function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(String(code).replace(/[^A-Z0-9]/gi, "").toUpperCase()).digest("hex");
}
