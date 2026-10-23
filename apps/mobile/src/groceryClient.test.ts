import { test, describe } from "node:test";
import assert from "node:assert";
import { formatExpiryDate, isExpired } from "./groceryDateUtils";

type GroceryItem = {
  id: number;
  user_id: number;
  name: string;
  quantity_value: number;
  quantity_unit: string;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

describe("formatExpiryDate", () => {
  test("formats YYYY-MM-DD to DD-MM-YYYY", () => {
    assert.strictEqual(formatExpiryDate("2026-10-31"), "31-10-2026");
  });

  test("formats YYYY-MM-DD with single-digit month and day", () => {
    assert.strictEqual(formatExpiryDate("2026-01-05"), "05-01-2026");
  });

  test("formats YYYY-MM-DD with single-digit month", () => {
    assert.strictEqual(formatExpiryDate("2026-03-15"), "15-03-2026");
  });

  test("formats YYYY-MM-DD with single-digit day", () => {
    assert.strictEqual(formatExpiryDate("2026-12-01"), "01-12-2026");
  });

  test("returns null for null input", () => {
    assert.strictEqual(formatExpiryDate(null), null);
  });

  test("returns null for undefined input", () => {
    assert.strictEqual(formatExpiryDate(undefined), null);
  });

  test("returns null for empty string", () => {
    assert.strictEqual(formatExpiryDate(""), null);
  });

  test("returns null for invalid date string", () => {
    assert.strictEqual(formatExpiryDate("not-a-date"), null);
  });

  test("returns null for DD-MM-YYYY format (wrong input format)", () => {
    assert.strictEqual(formatExpiryDate("31-10-2026"), null);
  });

  test("handles full ISO datetime string by extracting date part", () => {
    assert.strictEqual(formatExpiryDate("2026-10-31T00:00:00.000Z"), "31-10-2026");
  });
});

describe("isExpired", () => {
  const makeItem = (expiryDate: string | null): GroceryItem => ({
    id: 1,
    user_id: 1,
    name: "Test Item",
    quantity_value: 1,
    quantity_unit: "pcs",
    expiry_date: expiryDate,
    notes: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  test("returns false for null expiry_date", () => {
    assert.strictEqual(isExpired(makeItem(null)), false);
  });

  test("returns false for undefined expiry_date", () => {
    assert.strictEqual(isExpired(makeItem(undefined)), false);
  });

  test("returns false for a future date", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const iso = futureDate.toISOString().slice(0, 10);
    assert.strictEqual(isExpired(makeItem(iso)), false);
  });

  test("returns true for a past date", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const iso = pastDate.toISOString().slice(0, 10);
    assert.strictEqual(isExpired(makeItem(iso)), true);
  });

  test("returns true for today's date (expires today)", () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(isExpired(makeItem(today)), true);
  });

  test("returns false for tomorrow's date", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    assert.strictEqual(isExpired(makeItem(iso)), false);
  });

  test("returns true for yesterday's date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString().slice(0, 10);
    assert.strictEqual(isExpired(makeItem(iso)), true);
  });
});