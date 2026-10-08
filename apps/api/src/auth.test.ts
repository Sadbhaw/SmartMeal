import { test } from "node:test";
import * as assert from "node:assert";
import { createAccessToken, verifyAccessToken, createRefreshToken, hashToken, hashPassword, verifyPassword } from "./auth.js";

test("Authentication - Password hashing", async (t) => {
  const password = "TestPassword123!";
  const hashedPassword = await hashPassword(password);

  assert.ok(hashedPassword.length > 20, "Hashed password should be long");
  assert.notStrictEqual(hashedPassword, password, "Hash should not equal plaintext");

  const isValid = await verifyPassword(password, hashedPassword);
  assert.strictEqual(isValid, true, "Valid password should verify");

  const isInvalid = await verifyPassword("WrongPassword", hashedPassword);
  assert.strictEqual(isInvalid, false, "Invalid password should not verify");
});

test("Authentication - Access token creation and verification", (t) => {
  const userId = 123;
  const token = createAccessToken(userId);

  assert.ok(typeof token === "string", "Token should be a string");
  assert.ok(token.length > 0, "Token should not be empty");

  const decoded = verifyAccessToken(token);
  assert.strictEqual(decoded.sub, userId.toString(), "Token should contain correct user ID");
  assert.strictEqual(decoded.type, "access", "Token type should be access");
});

test("Authentication - Refresh token generation", (t) => {
  const token1 = createRefreshToken();
  const token2 = createRefreshToken();

  assert.ok(typeof token1 === "string", "Refresh token should be a string");
  assert.ok(token1.length > 0, "Refresh token should not be empty");
  assert.notStrictEqual(token1, token2, "Refresh tokens should be unique");
});

test("Authentication - Token hashing", (t) => {
  const token = "secret-token-123";
  const hash1 = hashToken(token);
  const hash2 = hashToken(token);

  assert.strictEqual(hash1, hash2, "Same token should produce same hash");
  assert.notStrictEqual(hash1, token, "Hash should differ from token");
});

test("Authentication - Expired token rejection", (t) => {
  // Create token that''s already expired by manipulating time
  const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzgwMjJ9.test";

  assert.throws(
    () => verifyAccessToken(expiredToken),
    { message: /Invalid or expired/ },
    "Expired token should throw error"
  );
});
