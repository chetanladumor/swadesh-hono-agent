import assert from "node:assert";
import { app } from "../apps/backend/src/app.js";

const USER_ID = "user_chetan_1";

async function runTests() {
  console.log("==========================================================");
  console.log("🧪 STARTING FULLSTACK MULTI-AGENT API INTEGRATION SUITE");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (e: any) {
      console.log(`❌ FAILED: ${e.message}`);
      failed++;
    }
  }

  // 1. Health Check
  await testCase("GET /api/health (System Health & DB Connectivity)", async () => {
    const res = await app.request("/api/health");
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
    assert.strictEqual(data.database, "connected");
    assert.ok(Array.isArray(data.agentsAvailable));
    assert.ok(data.agentsAvailable.includes("ROUTER"));
    assert.ok(data.agentsAvailable.includes("ORDER"));
    assert.ok(data.agentsAvailable.includes("BILLING"));
    assert.ok(data.agentsAvailable.includes("SUPPORT"));
  });

  // 2. List Agents
  await testCase("GET /api/agents (List Registered Multi-Agent Directory)", async () => {
    const res = await app.request("/api/agents");
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 4);
    const types = json.data.map((a: any) => a.type);
    assert.ok(types.includes("ROUTER"));
    assert.ok(types.includes("SUPPORT"));
    assert.ok(types.includes("ORDER"));
    assert.ok(types.includes("BILLING"));
  });

  // 3. Agent Capabilities
  await testCase("GET /api/agents/:type/capabilities (Inspect Order Agent)", async () => {
    const res = await app.request("/api/agents/ORDER/capabilities");
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.type, "ORDER");
    assert.ok(json.data.tools.includes("fetchOrderDetails"));
    assert.ok(json.data.tools.includes("checkDeliveryStatus"));
    assert.ok(json.data.tools.includes("cancelOrder"));
  });

  // 4. Invalid Agent Type (Error Handling)
  await testCase("GET /api/agents/INVALID_TYPE/capabilities (404 Error Handling)", async () => {
    const res = await app.request("/api/agents/INVALID_TYPE/capabilities");
    assert.strictEqual(res.status, 404);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.message.includes("not recognized"));
  });

  // 5. POST /api/chat/messages (Order Query)
  let createdConversationId: string = "";
  await testCase("POST /api/chat/messages (Order Tracking Query)", async () => {
    const res = await app.request("/api/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
      },
      body: JSON.stringify({
        content: "Where is my order ORDER-1001?",
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.conversationId);
    assert.ok(json.data.message.content.includes("ORDER-1001"));
    assert.strictEqual(json.data.agentType, "ORDER");
    assert.ok(json.data.reasoningSteps.length > 0);
    assert.ok(json.data.toolCalls.length > 0);
    createdConversationId = json.data.conversationId;
  });

  // 6. POST /api/chat/messages (Billing Query)
  await testCase("POST /api/chat/messages (Billing & Invoice Query)", async () => {
    const res = await app.request("/api/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
      },
      body: JSON.stringify({
        conversationId: createdConversationId,
        content: "What is the status of invoice INV-2024-002?",
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.message.content.includes("INV-2024-002"));
    assert.strictEqual(json.data.agentType, "BILLING");
  });

  // 7. POST /api/chat/messages (Support Policy Query)
  await testCase("POST /api/chat/messages (Support & FAQ Return Policy Query)", async () => {
    const res = await app.request("/api/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": USER_ID,
      },
      body: JSON.stringify({
        content: "What is your 30 day return policy?",
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.agentType, "SUPPORT");
    assert.ok(json.data.message.content.toLowerCase().includes("return") || json.data.message.content.toLowerCase().includes("policy"));
  });

  // 8. GET /api/chat/conversations
  await testCase("GET /api/chat/conversations (List User Conversations)", async () => {
    const res = await app.request("/api/chat/conversations", {
      headers: { "X-User-Id": USER_ID },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
  });

  // 9. GET /api/chat/conversations/:id
  await testCase("GET /api/chat/conversations/:id (Get Conversation History)", async () => {
    const res = await app.request(`/api/chat/conversations/${createdConversationId}`, {
      headers: { "X-User-Id": USER_ID },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdConversationId);
    assert.ok(json.data.messages.length >= 2);
  });

  // 10. DELETE /api/chat/conversations/:id
  await testCase("DELETE /api/chat/conversations/:id (Delete Conversation)", async () => {
    const res = await app.request(`/api/chat/conversations/${createdConversationId}`, {
      method: "DELETE",
      headers: { "X-User-Id": USER_ID },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    // Verify deletion
    const verifyRes = await app.request(`/api/chat/conversations/${createdConversationId}`, {
      headers: { "X-User-Id": USER_ID },
    });
    assert.strictEqual(verifyRes.status, 404);
  });

  // 11. Rate Limiting Test
  await testCase("Rate Limiting Verification (Burst & 429 Response)", async () => {
    // Check headers
    const res = await app.request("/api/health");
    const limit = res.headers.get("X-RateLimit-Limit");
    const remaining = res.headers.get("X-RateLimit-Remaining");
    assert.ok(limit !== null, "Missing X-RateLimit-Limit header");
    assert.ok(remaining !== null, "Missing X-RateLimit-Remaining header");
    assert.strictEqual(limit, "100");

    // Test isolated 5-req limiter instance for 429 status verification
    const { Hono } = await import("hono");
    const { createRateLimiter } = await import("../apps/backend/src/middlewares/rateLimiter.js");
    const { errorHandler } = await import("../apps/backend/src/middlewares/errorHandler.js");
    const testApp = new Hono();
    testApp.use("*", createRateLimiter({ maxRequests: 3, windowMs: 10000 }));
    testApp.get("/test", (c) => c.text("ok"));
    testApp.onError(errorHandler);

    await testApp.request("/test"); // 1
    await testApp.request("/test"); // 2
    await testApp.request("/test"); // 3
    const blocked = await testApp.request("/test"); // 4 -> 429
    assert.strictEqual(blocked.status, 429);
    const json = await blocked.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.statusCode, 429);
  });

  console.log("\n==========================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
