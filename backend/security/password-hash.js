import argon2 from "argon2";
import bcrypt from "bcryptjs";

export async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verifyPassword(password, hash) {
  if (typeof hash !== "string") return false;
  try {
    if (hash.startsWith("$argon2id$")) return await argon2.verify(hash, password);
    if (/^\$2[aby]\$/.test(hash)) return await bcrypt.compare(password, hash);
  } catch (_error) {
    return false;
  }
  return false;
}

export function needsPasswordRehash(hash) {
  return typeof hash !== "string" || !hash.startsWith("$argon2id$");
}
