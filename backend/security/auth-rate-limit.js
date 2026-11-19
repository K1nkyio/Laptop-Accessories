import crypto from "node:crypto";

export function createAuthRateLimiter({
  windowMs = 15 * 60 * 1000,
  accountLimit = 8,
  addressLimit = 40,
  maxEntries = 10_000,
  now = Date.now,
} = {}) {
  const buckets = new Map();

  function keysFor(req) {
    const address = String(req.ip || req.socket?.remoteAddress || "unknown");
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const emailHash = crypto.createHash("sha256").update(email).digest("hex");
    return [`address:${address}`, `account:${emailHash}`];
  }

  function prune(currentTime, neededSlots = 0) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) buckets.delete(key);
    }
    while (buckets.size + neededSlots > maxEntries) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  function clear(req) {
    buckets.delete(keysFor(req)[1]);
  }

  function middleware(req, res, next) {
    const currentTime = now();
    const keys = keysFor(req);
    const limits = [addressLimit, accountLimit];
    const existing = keys.map((key) => buckets.get(key));
    const blocked = existing.find((bucket, index) => bucket && bucket.count >= limits[index] && bucket.resetAt > currentTime);

    if (blocked) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((blocked.resetAt - currentTime) / 1000))));
      res.status(429).json({ error: "Too many authentication attempts. Please try again later." });
      return;
    }

    prune(currentTime, keys.filter((key) => !buckets.has(key)).length);
    for (let index = 0; index < keys.length; index += 1) {
      const bucket = buckets.get(keys[index]);
      if (bucket && bucket.resetAt > currentTime) {
        bucket.count += 1;
      } else {
        buckets.set(keys[index], { count: 1, resetAt: currentTime + windowMs });
      }
    }
    next();
  }

  middleware.clear = clear;
  middleware.size = () => buckets.size;
  return middleware;
}
