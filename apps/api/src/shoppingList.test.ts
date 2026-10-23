import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { FastifyInstance } from "fastify";
import { Pool } from "pg";
import { AuthService } from "./authService.js";
import { authRoutes } from "./authRoutes.js";
import { hashPassword } from "./auth.js";
import { ShoppingListService } from "./shoppingListService.js";
import { shoppingListRoutes } from "./shoppingListRoutes.js";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "smartmeal",
  user: process.env.DB_USER || "smartmeal",
  password: process.env.DB_PASSWORD || "smartmeal_dev",
});

let app: FastifyInstance;
let accessToken!: string;
let userId!: number;

const uniqueName = `Test Item ${Date.now()}`;

const registerUser = async (email: string): Promise<number> => {
  const passwordHash = await hashPassword("password123");
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, passwordHash]
  );
  return result.rows[0].id;
};

const authenticate = async (email: string): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password: "password123" },
  });
  const body = JSON.parse(response.body);
  return body.access_token;
};

before(async () => {
  app = Fastify();
  const authService = new AuthService(pool);
  authRoutes(app, authService);
  shoppingListRoutes(app, pool);
  await app.ready();

  const email = `shopping-list-test-${Date.now()}@example.com`;
  userId = await registerUser(email);
  accessToken = await authenticate(email);
});

after(async () => {
  await app.close();
  await pool.end();
});

const authHeaders = () => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

const deleteHeaders = () => ({
  Authorization: `Bearer ${accessToken}`,
});

const createItem = async (payload: Record<string, unknown>) => {
  const res = await app.inject({
    method: "POST",
    url: "/api/shopping-list",
    headers: authHeaders(),
    payload,
  });
  return res;
};

test("GET /api/shopping-list returns 401 without a token", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/shopping-list",
  });

  assert.equal(res.statusCode, 401);
});

test("GET /api/shopping-list returns an empty list for a new user", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/api/shopping-list",
    headers: authHeaders(),
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.status, "success");
  assert.ok(Array.isArray(body.data));
});

test("POST /api/shopping-list creates an item", async () => {
  const res = await createItem({
    name: uniqueName,
    quantity_value: 2,
    quantity_unit: "pcs",
  });

  assert.equal(res.statusCode, 201);
  const body = res.json();
  assert.equal(body.status, "success");
  assert.equal(body.data.name, uniqueName);
  assert.equal(Number(body.data.quantity_value), 2);
  assert.equal(body.data.quantity_unit, "pcs");
  assert.equal(body.data.is_checked, false);
  assert.equal(body.data.user_id, userId);
});

test("POST /api/shopping-list rejects a missing name", async () => {
  const res = await createItem({ quantity_value: 1 });

  assert.equal(res.statusCode, 400);
  assert.equal(res.json().message, "name is required");
});

test("POST /api/shopping-list rejects a negative quantity", async () => {
  const res = await createItem({ name: "Bad Item", quantity_value: -1 });

  assert.equal(res.statusCode, 400);
  assert.match(res.json().message, /quantity_value/);
});

test("PUT /api/shopping-list/:id updates an item", async () => {
  const created = await createItem({ name: "Update Me", quantity_value: 1 });
  const id = created.json().data.id;

  const res = await app.inject({
    method: "PUT",
    url: `/api/shopping-list/${id}`,
    headers: authHeaders(),
    payload: {
      name: "Updated Item",
      quantity_value: 3,
      quantity_unit: "kg",
      is_checked: true,
    },
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.data.name, "Updated Item");
  assert.equal(Number(body.data.quantity_value), 3);
  assert.equal(body.data.quantity_unit, "kg");
  assert.equal(body.data.is_checked, true);
});

test("PUT /api/shopping-list/:id returns 404 for a non-existent item", async () => {
  const res = await app.inject({
    method: "PUT",
    url: "/api/shopping-list/999999999",
    headers: authHeaders(),
    payload: { name: "Ghost" },
  });

  assert.equal(res.statusCode, 404);
});

test("PUT /api/shopping-list/:id returns 400 for an invalid id", async () => {
  const res = await app.inject({
    method: "PUT",
    url: "/api/shopping-list/not-a-number",
    headers: authHeaders(),
    payload: { name: "Ghost" },
  });

  assert.equal(res.statusCode, 400);
});

test("DELETE /api/shopping-list/:id removes an item", async () => {
  const created = await createItem({ name: "Delete Me" });
  const id = created.json().data.id;

  const res = await app.inject({
    method: "DELETE",
    url: `/api/shopping-list/${id}`,
    headers: deleteHeaders(),
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "success");
});

test("DELETE /api/shopping-list/:id returns 404 for a non-existent item", async () => {
  const res = await app.inject({
    method: "DELETE",
    url: "/api/shopping-list/999999999",
    headers: deleteHeaders(),
  });

  assert.equal(res.statusCode, 404);
});

test("cross-user access is isolated (404 for another user's item)", async () => {
  const service = new ShoppingListService(pool);

  const otherEmail = `shopping-list-other-${Date.now()}@example.com`;
  const otherUserId = await registerUser(otherEmail);

  const item = await service.createItem(otherUserId, "Other User Item", 1, "pcs", false);

  // The first user cannot update or delete the other user's item.
  const putRes = await app.inject({
    method: "PUT",
    url: `/api/shopping-list/${item.id}`,
    headers: authHeaders(),
    payload: { name: "Hijacked" },
  });
  assert.equal(putRes.statusCode, 404);

  const delRes = await app.inject({
    method: "DELETE",
    url: `/api/shopping-list/${item.id}`,
    headers: deleteHeaders(),
  });
  assert.equal(delRes.statusCode, 404);

  // Clean up the other user's item.
  await service.deleteItem(otherUserId, item.id);
});