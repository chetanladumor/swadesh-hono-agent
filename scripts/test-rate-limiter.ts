import assert from "node:assert";
import { Hono } from "hono";
import { createRateLimiter } from "../apps/backend/src/middlewares/rateLimiter.js";
import { errorHandler } from "../apps/backend/src/middlewares/errorHandler.js";

async function testRateLimiting() {
  console.log("==========================================================");
  console.log("🚦 TESTING RATE LIMITING MIDDLEWARE BURST & 429 BEHAVIOR");
  console.log("==========================================================\n");

  const app = new Hono();
  // Set a test rate limiter: 5 requests per 10 seconds
  app.use("*", createRateLimiter({ maxRequests: 5, windowMs: 10 * 1000 }));
  app.get("/test", (c) => c.text("ok"));
  app.onError(errorHandler);

  console.log("Sending 5 normal requests within threshold...");
  for (let i = 1; i <= 5; i++) {
    const res = await app.request("/test");
    const limit = res.headers.get("X-RateLimit-Limit");
    const remaining = res.headers.get("X-RateLimit-Remaining");
    console.log(`  Request #${i}: Status ${res.status}, Remaining: ${remaining}/${limit}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(remaining, String(5 - i));
  }

  console.log("\nSending 6th request exceeding limit threshold...");
  const blockedRes = await app.request("/test");
  console.log(`  Request #6: Status ${blockedRes.status} (Expected 429)`);
  assert.strictEqual(blockedRes.status, 429);

  const json = await blockedRes.json();
  console.log("  429 JSON Body:", JSON.stringify(json));
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.error.statusCode, 429);
  assert.ok(json.error.message.includes("Too many requests"));
  assert.ok(blockedRes.headers.get("Retry-After") !== null);

  console.log("\n==========================================================");
  console.log("✅ RATE LIMITER STRICTLY ENFORCES 429 TOO MANY REQUESTS!");
  console.log("==========================================================");
}

testRateLimiting().catch((e) => {
  console.error("Rate limit test failed:", e);
  process.exit(1);
});
