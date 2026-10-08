import { test } from "node:test";
import * as assert from "node:assert";
import Fastify from "fastify";

test("GET /health returns ok status", async (t) => {
  const fastify = Fastify();

  fastify.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  const response = await fastify.inject({
    method: "GET",
    url: "/health",
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.status, "ok");
  assert.ok(body.timestamp);

  await fastify.close();
});
