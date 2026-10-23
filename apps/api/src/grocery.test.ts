import { test, before, after } from "node:test";
import assert from "node:assert";
import { Pool } from "pg";
import Fastify, { FastifyInstance } from "fastify";
import { groceryRoutes } from "./groceryRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { AuthService } from "./authService.js";
import { hashPassword } from "./auth.js";

const getEnv = (key: string, defaultVal: string): string => {
  return process.env[key] || defaultVal;
};

const DB_HOST = getEnv("DB_HOST", "localhost");
const DB_PORT = parseInt(getEnv("DB_PORT", "5432"), 10);
const DB_NAME = getEnv("DB_NAME", "smartmeal");
const DB_USER = getEnv("DB_USER", "smartmeal");
const DB_PASSWORD = getEnv("DB_PASSWORD", "smartmeal_dev");

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});

let fastify: FastifyInstance;

const unique = () => Math.random().toString(36).slice(2, 10);

const registerUser = async (email: string): Promise<number> => {
  const passwordHash = await hashPassword("password123");
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
    [email, passwordHash]
  );
  return result.rows[0].id;
};

const createItem = async (
  userId: number,
  name: string,
  quantityValue: number,
  quantityUnit: string
): Promise<number> => {
  const result = await pool.query(
    `INSERT INTO grocery_items (user_id, food_id, name, quantity_value, quantity_unit, expiry_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [userId, null, name, quantityValue, quantityUnit, null, null]
  );
  return result.rows[0].id;
};

const authenticate = async (fastify: FastifyInstance, email: string, password: string): Promise<string> => {
  const response = await fastify.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email, password },
  });
  const body = JSON.parse(response.body);
  return body.access_token;
};

const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

before(async () => {
  fastify = Fastify();
  const authService = new AuthService(pool);
  authRoutes(fastify, authService);
  groceryRoutes(fastify, pool);
  await fastify.ready();
});

after(async () => {
  await fastify.close();
  await pool.end();
});

test("GET /api/grocery/inventory returns 401 when no token is provided", async () => {
  const response = await fastify.inject({
    method: "GET",
    url: "/api/grocery/inventory",
  });
  assert.strictEqual(response.statusCode, 401);
});

test("GET /api/grocery/inventory returns 401 for an invalid token", async () => {
  const response = await fastify.inject({
    method: "GET",
    url: "/api/grocery/inventory",
    headers: authHeader("invalid-token"),
  });
  assert.strictEqual(response.statusCode, 401);
});

test("GET /api/grocery/inventory returns the authenticated user's items", async () => {
  const email = `grocery-list-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const created = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Milk", quantity_value: 2, quantity_unit: "L" },
  });
  const createdBody = JSON.parse(created.body);
  assert.strictEqual(created.statusCode, 201);

  const response = await fastify.inject({
    method: "GET",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.status, "success");
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((item: any) => item.id === createdBody.data.id));
});

test("GET /api/grocery/inventory/:id returns the item when it belongs to the user", async () => {
  const email = `grocery-get-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Eggs", 12, "pcs");

  const response = await fastify.inject({
    method: "GET",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.id, itemId);
  assert.strictEqual(body.data.name, "Eggs");
});

test("GET /api/grocery/inventory/:id returns 404 for a non-existent item", async () => {
  const email = `grocery-404-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "GET",
    url: "/api/grocery/inventory/99999999",
    headers: authHeader(token),
  });
  assert.strictEqual(response.statusCode, 404);
});
test("POST /api/grocery/inventory creates an item and returns 201", async () => {
  const email = `grocery-create-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: {
      name: "Chicken Breast",
      quantity_value: 500,
      quantity_unit: "g",
      expiry_date: "2026-12-31",
      notes: "Buy organic",
    },
  });

  assert.strictEqual(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.status, "success");
  assert.strictEqual(body.data.name, "Chicken Breast");
  assert.strictEqual(Number(body.data.quantity_value), 500);
  assert.strictEqual(body.data.quantity_unit, "g");
  assert.strictEqual(body.data.user_id, userId);
});

test("POST /api/grocery/inventory returns 400 when name is missing", async () => {
  const email = `grocery-val-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { quantity_value: 1, quantity_unit: "pcs" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("POST /api/grocery/inventory returns 400 for a negative quantity", async () => {
  const email = `grocery-neg-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Apples", quantity_value: -5, quantity_unit: "pcs" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("POST /api/grocery/inventory returns 400 for an invalid expiry_date", async () => {
  const email = `grocery-date-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Bread", quantity_value: 1, quantity_unit: "pcs", expiry_date: "2026-13-45" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("POST /api/grocery/inventory returns 400 for a malformed expiry_date format", async () => {
  const email = `grocery-datefmt-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Bread", quantity_value: 1, quantity_unit: "pcs", expiry_date: "not-a-date" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("POST /api/grocery/inventory returns 400 for a DD-MM-YYYY expiry_date (wrong format)", async () => {
  const email = `grocery-ddmm-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Bread", quantity_value: 1, quantity_unit: "pcs", expiry_date: "31-10-2026" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("PUT /api/grocery/inventory/:id updates an item and returns 200", async () => {
  const email = `grocery-update-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Rice", 1, "kg");

  const response = await fastify.inject({
    method: "PUT",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
    payload: { name: "Basmati Rice", quantity_value: 2.5, quantity_unit: "kg" },
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.name, "Basmati Rice");
  assert.strictEqual(Number(body.data.quantity_value), 2.5);
});

test("POST /api/grocery/inventory stores and returns expiry_date as YYYY-MM-DD", async () => {
  const email = `grocery-expiry-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Milk", quantity_value: 1, quantity_unit: "L", expiry_date: "2026-10-31" },
  });

  assert.strictEqual(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.expiry_date, "2026-10-31");
});

test("GET /api/grocery/inventory/:id returns expiry_date as YYYY-MM-DD", async () => {
  const email = `grocery-expiry-get-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const created = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Yogurt", quantity_value: 2, quantity_unit: "pcs", expiry_date: "2026-10-31" },
  });
  const createdBody = JSON.parse(created.body);
  const itemId = createdBody.data.id;

  const response = await fastify.inject({
    method: "GET",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.expiry_date, "2026-10-31");
});

test("PUT /api/grocery/inventory/:id updates expiry_date and returns YYYY-MM-DD", async () => {
  const email = `grocery-expiry-put-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Cheese", 100, "g");

  const response = await fastify.inject({
    method: "PUT",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
    payload: { name: "Cheese", quantity_value: 100, quantity_unit: "g", expiry_date: "2026-12-15" },
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.expiry_date, "2026-12-15");
});

test("PUT /api/grocery/inventory/:id returns 404 when the item does not exist", async () => {
  const email = `grocery-upd404-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "PUT",
    url: "/api/grocery/inventory/99999999",
    headers: authHeader(token),
    payload: { name: "Rice", quantity_value: 1, quantity_unit: "kg" },
  });
  assert.strictEqual(response.statusCode, 404);
});

test("expiry_date round-trip: 31-10-2026 input becomes 2026-10-31 in API", async () => {
  const email = `grocery-roundtrip-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  // Simulate what the mobile app sends after converting DD-MM-YYYY to YYYY-MM-DD
  const response = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Milk", quantity_value: 1, quantity_unit: "L", expiry_date: "2026-10-31" },
  });

  assert.strictEqual(response.statusCode, 201);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.data.expiry_date, "2026-10-31");

  // Verify the stored value in the database
  const dbResult = await pool.query(
    "SELECT TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date FROM grocery_items WHERE id = $1",
    [body.data.id]
  );
  const dbDateString = dbResult.rows[0].expiry_date;
  assert.strictEqual(dbDateString, "2026-10-31");
});

test("expiry_date is preserved across multiple API calls without timezone shift", async () => {
  const email = `grocery-tz-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const created = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(token),
    payload: { name: "Eggs", quantity_value: 12, quantity_unit: "pcs", expiry_date: "2026-10-31" },
  });
  const createdBody = JSON.parse(created.body);
  const itemId = createdBody.data.id;

  // Fetch the item multiple times to ensure consistent date
  for (let i = 0; i < 3; i++) {
    const response = await fastify.inject({
      method: "GET",
      url: `/api/grocery/inventory/${itemId}`,
      headers: authHeader(token),
    });
    const body = JSON.parse(response.body);
    assert.strictEqual(body.data.expiry_date, "2026-10-31");
  }
});

test("PUT /api/grocery/inventory/:id returns 400 for an invalid expiry_date", async () => {
  const email = `grocery-put-date-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Bread", 1, "pcs");

  const response = await fastify.inject({
    method: "PUT",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
    payload: { name: "Bread", quantity_value: 1, quantity_unit: "pcs", expiry_date: "2026-13-45" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("PUT /api/grocery/inventory/:id returns 400 for a malformed expiry_date format", async () => {
  const email = `grocery-put-datefmt-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Bread", 1, "pcs");

  const response = await fastify.inject({
    method: "PUT",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
    payload: { name: "Bread", quantity_value: 1, quantity_unit: "pcs", expiry_date: "invalid-date" },
  });
  assert.strictEqual(response.statusCode, 400);
});

test("DELETE /api/grocery/inventory/:id removes the item and returns 200", async () => {
  const email = `grocery-delete-${unique()}@test.com`;
  const userId = await registerUser(email);
  const token = await authenticate(fastify, email, "password123");
  const itemId = await createItem(userId, "Butter", 250, "g");

  const response = await fastify.inject({
    method: "DELETE",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
  });
  assert.strictEqual(response.statusCode, 200);

  const afterDelete = await fastify.inject({
    method: "GET",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(token),
  });
  assert.strictEqual(afterDelete.statusCode, 404);
});

test("DELETE /api/grocery/inventory/:id returns 404 when the item does not exist", async () => {
  const email = `grocery-del404-${unique()}@test.com`;
  await registerUser(email);
  const token = await authenticate(fastify, email, "password123");

  const response = await fastify.inject({
    method: "DELETE",
    url: "/api/grocery/inventory/99999999",
    headers: authHeader(token),
  });
  assert.strictEqual(response.statusCode, 404);
});

test("users cannot access another user's grocery items", async () => {
  const ownerEmail = `grocery-owner-${unique()}@test.com`;
  const otherEmail = `grocery-other-${unique()}@test.com`;
  await registerUser(ownerEmail);
  await registerUser(otherEmail);

  const ownerToken = await authenticate(fastify, ownerEmail, "password123");
  const otherToken = await authenticate(fastify, otherEmail, "password123");

  const created = await fastify.inject({
    method: "POST",
    url: "/api/grocery/inventory",
    headers: authHeader(ownerToken),
    payload: { name: "Secret Item", quantity_value: 1, quantity_unit: "pcs" },
  });
  const createdBody = JSON.parse(created.body);
  const itemId = createdBody.data.id;

  const otherGet = await fastify.inject({
    method: "GET",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(otherToken),
  });
  assert.strictEqual(otherGet.statusCode, 404);

  const otherUpdate = await fastify.inject({
    method: "PUT",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(otherToken),
    payload: { name: "Hacked", quantity_value: 1, quantity_unit: "pcs" },
  });
  assert.strictEqual(otherUpdate.statusCode, 404);

  const otherDelete = await fastify.inject({
    method: "DELETE",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(otherToken),
  });
  assert.strictEqual(otherDelete.statusCode, 404);

  const stillExists = await fastify.inject({
    method: "GET",
    url: `/api/grocery/inventory/${itemId}`,
    headers: authHeader(ownerToken),
  });
  assert.strictEqual(stillExists.statusCode, 200);
});

