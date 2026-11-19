import test from "node:test";
import assert from "node:assert/strict";
import { createAuthRateLimiter } from "../security/auth-rate-limit.js";

function request(email, ip = "127.0.0.1") {
  return { ip, body: { email }, socket: { remoteAddress: ip } };
}

function invoke(limiter, req) {
  let continued = false;
  let statusCode = 200;
  let payload;
  const headers = {};
  limiter(req, {
    setHeader(name, value) { headers[name] = value; },
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; },
  }, () => { continued = true; });
  return { continued, statusCode, payload, headers };
}

test("authentication attempts are limited per account and per client address", () => {
  const limiter = createAuthRateLimiter({ accountLimit: 2, addressLimit: 4 });
  assert.equal(invoke(limiter, request("a@example.com")).continued, true);
  assert.equal(invoke(limiter, request("a@example.com")).continued, true);
  const blocked = invoke(limiter, request("a@example.com"));
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers["Retry-After"]) > 0);
  assert.equal(invoke(limiter, request("b@example.com")).continued, true);
});

test("expired buckets reset and successful authentication can clear the buckets", () => {
  let clock = 100;
  const limiter = createAuthRateLimiter({ accountLimit: 1, addressLimit: 10, windowMs: 20, now: () => clock });
  const req = request("a@example.com");
  assert.equal(invoke(limiter, req).continued, true);
  assert.equal(invoke(limiter, req).statusCode, 429);
  limiter.clear(req);
  assert.equal(invoke(limiter, req).continued, true);
  clock += 21;
  assert.equal(invoke(limiter, request("b@example.com", "10.0.0.1")).continued, true);
});

test("the limiter bounds stored keys", () => {
  const limiter = createAuthRateLimiter({ maxEntries: 4 });
  for (let index = 0; index < 20; index += 1) {
    invoke(limiter, request(`user${index}@example.com`, `10.0.0.${index}`));
  }
  assert.ok(limiter.size() <= 4);
});
