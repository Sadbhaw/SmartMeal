import { test, before, after } from "node:test";
import * as assert from "node:assert";
import { Pool } from "pg";
import { runMigrations } from "../db/migrate.js";
import { AuthService } from "./authService.js";
import { ProfileService } from "./profileService.js";
import { MealService } from "./mealService.js";
import { NutritionProfile } from "./nutrition.js";

const getEnv = (key: string, defaultVal: string): string => {
  return process.env[key] || defaultVal;
};

const DB_HOST = getEnv("DB_HOST", "localhost");
const DB_PORT = parseInt(getEnv("DB_PORT", "5432"), 10);
const DB_NAME = getEnv("DB_NAME", "smartmeal");
const DB_USER = getEnv("DB_USER", "smartmeal");
const DB_PASSWORD = getEnv("DB_PASSWORD", "smartmeal_dev");

let pool: Pool;
let authService: AuthService;
let profileService: ProfileService;
let mealService: MealService;

let user1Id: number;
let user2Id: number;
let brownBreadId: number;
let breakfastTypeId: number;
let todayDate: string;

before(async () => {
  pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  // Run migrations
  await runMigrations(pool);

  authService = new AuthService(pool);
  profileService = new ProfileService(pool);
  mealService = new MealService(pool);

  // Clean up test data
  await pool.query("DELETE FROM meal_entries");
  await pool.query("DELETE FROM user_profiles");
  await pool.query("DELETE FROM users WHERE email LIKE 'mealtest_%'");

  // Create test users
  user1Id = await authService.registerUser("mealtest_user1@example.com", "Password123!");
  user2Id = await authService.registerUser("mealtest_user2@example.com", "Password123!");

  // Create profile for user 1
  const profile: NutritionProfile = {
    age: 25,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderately_active",
    goal: "maintenance",
  };
  await profileService.createProfile(user1Id, profile);

  // Get Brown Bread food ID (seeded in migration 003)
  const foodResult = await pool.query("SELECT id FROM foods WHERE name = 'Brown Bread'");
  assert.ok(foodResult.rows.length > 0, "Brown Bread should exist in food database");
  brownBreadId = foodResult.rows[0].id;

  // Get Breakfast meal type ID (seeded in migration 004)
  const mealTypeResult = await pool.query("SELECT id FROM meal_types WHERE name = 'Breakfast'");
  assert.ok(mealTypeResult.rows.length > 0, "Breakfast meal type should exist");
  breakfastTypeId = mealTypeResult.rows[0].id;

  todayDate = new Date().toISOString().split("T")[0];
});

after(async () => {
  if (pool) {
    await pool.query("DELETE FROM meal_entries");
    await pool.query("DELETE FROM user_profiles");
    await pool.query("DELETE FROM users WHERE email LIKE 'mealtest_%'");
    await pool.end();
  }
});

// 1. Create meal entry
test("Meal - Create meal entry", async (t) => {
  const entry = await mealService.createMealEntry(
    user1Id,
    brownBreadId,
    breakfastTypeId,
    60,
    "g",
    todayDate
  );

  assert.ok(entry.id > 0, "Entry ID should be set");
  assert.strictEqual(entry.user_id, user1Id);
  assert.strictEqual(entry.food_id, brownBreadId);
  assert.strictEqual(entry.meal_type_id, breakfastTypeId);
  assert.strictEqual(Number(entry.quantity_value), 60);
  assert.strictEqual(entry.quantity_unit, "g");
});

// 2. Reject zero quantity
test("Meal - Reject zero quantity", async (t) => {
  await assert.rejects(
    async () => {
      await mealService.createMealEntry(user1Id, brownBreadId, breakfastTypeId, 0, "g", todayDate);
    },
    /quantity|check/i
  );
});

// 3. Reject negative quantity
test("Meal - Reject negative quantity", async (t) => {
  await assert.rejects(
    async () => {
      await mealService.createMealEntry(user1Id, brownBreadId, breakfastTypeId, -10, "g", todayDate);
    },
    /quantity|check/i
  );
});

// 4. Reject invalid meal type
test("Meal - Reject invalid meal type", async (t) => {
  await assert.rejects(
    async () => {
      await mealService.createMealEntry(user1Id, brownBreadId, 99999, 60, "g", todayDate);
    },
    /foreign key|violates/i
  );
});

// 5. Reject nonexistent food
test("Meal - Reject nonexistent food", async (t) => {
  await assert.rejects(
    async () => {
      await mealService.createMealEntry(user1Id, 99999, breakfastTypeId, 60, "g", todayDate);
    },
    /Food not found/i
  );
});

// 6-10. Correct scaling tests for Brown Bread (30g = 75kcal, 2.5g P, 14g C, 0.8g F, 2g Fiber) -> 60g double
test("Meal - Correct nutrition scaling for 60g Brown Bread", async (t) => {
  const entry = await mealService.createMealEntry(
    user1Id,
    brownBreadId,
    breakfastTypeId,
    60,
    "g",
    todayDate
  );

  // 6. Calorie scaling: 75 * (60/30) = 150
  assert.strictEqual(Number(entry.calories), 150, "Calories should scale to 150");

  // 7. Protein scaling: 2.5 * (60/30) = 5
  assert.strictEqual(Number(entry.protein_g), 5, "Protein should scale to 5g");

  // 8. Carbohydrate scaling: 14 * (60/30) = 28
  assert.strictEqual(Number(entry.carbohydrates_g), 28, "Carbs should scale to 28g");

  // 9. Fat scaling: 0.8 * (60/30) = 1.6
  assert.strictEqual(Number(entry.fat_g), 1.6, "Fat should scale to 1.6g");

  // 10. Fiber scaling: 2 * (60/30) = 4
  assert.strictEqual(Number(entry.fiber_g), 4, "Fiber should scale to 4g");
});

// 11. Retrieve meals by date
test("Meal - Retrieve meals by date", async (t) => {
  const meals = await mealService.getMealEntriesForDate(user1Id, todayDate);
  assert.ok(Array.isArray(meals));
  assert.ok(meals.length >= 2, "Should return logged entries for user 1");
  assert.strictEqual(meals[0].food_name, "Brown Bread");
});

// 12. Do not return another user's meals
test("Meal - Do not return another user's meals", async (t) => {
  const user2Meals = await mealService.getMealEntriesForDate(user2Id, todayDate);
  assert.strictEqual(user2Meals.length, 0, "User 2 should have 0 meals");
});

// 13. Get individual meal entry
test("Meal - Get individual meal entry", async (t) => {
  const meals = await mealService.getMealEntriesForDate(user1Id, todayDate);
  const firstEntry = meals[0];

  const fetched = await mealService.getMealEntryById(user1Id, firstEntry.id);
  assert.ok(fetched !== null);
  assert.strictEqual(fetched?.id, firstEntry.id);
  assert.strictEqual(fetched?.food_name, "Brown Bread");
});

// 14. Prevent another user from reading an entry
test("Meal - Prevent another user from reading an entry", async (t) => {
  const meals = await mealService.getMealEntriesForDate(user1Id, todayDate);
  const firstEntry = meals[0];

  const fetched = await mealService.getMealEntryById(user2Id, firstEntry.id);
  assert.strictEqual(fetched, null, "User 2 should not be able to read User 1's meal entry");
});

// 15. Update meal entry
test("Meal - Update meal entry", async (t) => {
  const meals = await mealService.getMealEntriesForDate(user1Id, todayDate);
  const entryId = meals[0].id;

  // 16. Update quantity to 90g (triple: 225kcal, 7.5g P, 42g C, 2.4g F, 6g Fiber)
  const updated = await mealService.updateMealEntry(
    user1Id,
    entryId,
    brownBreadId,
    breakfastTypeId,
    90,
    "g",
    todayDate
  );

  assert.strictEqual(Number(updated.quantity_value), 90);
  assert.strictEqual(Number(updated.calories), 225);
  assert.strictEqual(Number(updated.protein_g), 7.5);
  assert.strictEqual(Number(updated.carbohydrates_g), 42);
  assert.strictEqual(Number(updated.fat_g), 2.4);
  assert.strictEqual(Number(updated.fiber_g), 6);
});

// 17. Delete meal entry
test("Meal - Delete meal entry", async (t) => {
  const meals = await mealService.getMealEntriesForDate(user1Id, todayDate);
  const entryIdToDelete = meals[0].id;

  await mealService.deleteMealEntry(user1Id, entryIdToDelete);

  // 18. Deleted entry no longer appears
  const fetched = await mealService.getMealEntryById(user1Id, entryIdToDelete);
  assert.strictEqual(fetched, null, "Deleted entry should not exist");
});

// 19-21. Daily summary tests (consumed, targets, remaining)
test("Meal - Daily summary totals, targets, and remaining values", async (t) => {
  // Clear and add specific entry: 60g Brown Bread
  await pool.query("DELETE FROM meal_entries WHERE user_id = $1", [user1Id]);

  await mealService.createMealEntry(
    user1Id,
    brownBreadId,
    breakfastTypeId,
    60,
    "g",
    todayDate
  );

  const summary = await mealService.getDailyNutritionSummary(user1Id, todayDate);

  // 19. Consumed totals
  assert.strictEqual(summary.consumed.calories, 150);
  assert.strictEqual(summary.consumed.protein_g, 5);
  assert.strictEqual(summary.consumed.carbohydrates_g, 28);
  assert.strictEqual(summary.consumed.fat_g, 1.6);
  assert.strictEqual(summary.consumed.fiber_g, 4);

  // 20. Target values (from profile: 180cm, 80kg, 25yr, male, moderate, maintenance)
  assert.ok(summary.targets !== null);
  assert.ok(summary.targets!.calories > 0);
  assert.ok(summary.targets!.protein_g > 0);

  // 21. Remaining values (target - consumed)
  assert.ok(summary.remaining !== null);
  assert.strictEqual(
    summary.remaining!.calories,
    Math.round((summary.targets!.calories - 150) * 100) / 100
  );
  assert.strictEqual(
    summary.remaining!.protein_g,
    Math.round((summary.targets!.protein_g - 5) * 100) / 100
  );
});

// 22. Missing profile behavior
test("Meal - Daily summary with missing profile returns null targets", async (t) => {
  const summary = await mealService.getDailyNutritionSummary(user2Id, todayDate);

  assert.strictEqual(summary.consumed.calories, 0);
  assert.strictEqual(summary.targets, null, "User 2 has no profile so targets should be null");
  assert.strictEqual(summary.remaining, null, "User 2 has no profile so remaining should be null");
});

// 23. Unauthorized / Cross-user update & delete prevention
test("Meal - Prevent cross-user update and delete", async (t) => {
  const entry = await mealService.createMealEntry(
    user1Id,
    brownBreadId,
    breakfastTypeId,
    30,
    "g",
    todayDate
  );

  // User 2 trying to update User 1's entry
  await assert.rejects(
    async () => {
      await mealService.updateMealEntry(user2Id, entry.id, brownBreadId, breakfastTypeId, 60, "g", todayDate);
    },
    /Meal entry not found/i
  );

  // User 2 trying to delete User 1's entry
  await assert.rejects(
    async () => {
      await mealService.deleteMealEntry(user2Id, entry.id);
    },
    /Meal entry not found/i
  );
});

// 24. Future-date validation
test("Meal - Reject future dates", async (t) => {
  const futureDate = "2099-12-31";

  await assert.rejects(
    async () => {
      await mealService.createMealEntry(user1Id, brownBreadId, breakfastTypeId, 30, "g", futureDate);
    },
    /future/i
  );
});

// 25. Client cannot inject nutrition values (verified by interface contract)
test("Meal - Backend calculates nutrition and ignores client inputs", async (t) => {
  // Service createMealEntry parameters do not accept calories or macros.
  // It fetches food from DB and calculates values strictly backend-side.
  const entry = await mealService.createMealEntry(
    user1Id,
    brownBreadId,
    breakfastTypeId,
    30,
    "g",
    todayDate
  );

  // Brown Bread 30g = 75 kcal, 2.5g protein
  assert.strictEqual(Number(entry.calories), 75);
  assert.strictEqual(Number(entry.protein_g), 2.5);
});
