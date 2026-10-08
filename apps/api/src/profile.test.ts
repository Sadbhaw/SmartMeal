import { test } from "node:test";
import * as assert from "node:assert";
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, calculateNutritionTargets, validateProfile, NutritionProfile } from "./nutrition.js";

test("Nutrition - BMR calculation (male)", (t) => {
  const profile: NutritionProfile = {
    age: 30,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderately_active",
    goal: "maintenance",
  };

  const bmr = calculateBMR(profile);
  // BMR = 10(80) + 6.25(180) - 5(30) + 5 = 800 + 1125 - 150 + 5 = 1780
  assert.strictEqual(bmr, 1780, "Male BMR should be calculated correctly");
});

test("Nutrition - BMR calculation (female)", (t) => {
  const profile: NutritionProfile = {
    age: 25,
    gender: "female",
    height_cm: 165,
    weight_kg: 65,
    activity_level: "moderately_active",
    goal: "maintenance",
  };

  const bmr = calculateBMR(profile);
  // BMR = 10(65) + 6.25(165) - 5(25) - 161 = 650 + 1031.25 - 125 - 161 = 1395.25
  assert.strictEqual(bmr, 1395.25, "Female BMR should be calculated correctly");
});

test("Nutrition - TDEE calculation", (t) => {
  const bmr = 1800;
  const tdee_sedentary = calculateTDEE(bmr, "sedentary");
  const tdee_moderate = calculateTDEE(bmr, "moderately_active");

  // sedentary: 1800 * 1.2 = 2160
  assert.strictEqual(tdee_sedentary, 2160, "Sedentary TDEE should be BMR * 1.2");

  // moderately_active: 1800 * 1.55 = 2790
  assert.strictEqual(tdee_moderate, 2790, "Moderately active TDEE should be BMR * 1.55");
});

test("Nutrition - Target calories by goal", (t) => {
  const maintenance = 2500;

  const weight_loss = calculateTargetCalories(maintenance, "weight_loss");
  const maintenance_target = calculateTargetCalories(maintenance, "maintenance");
  const muscle_gain = calculateTargetCalories(maintenance, "muscle_gain");

  // weight_loss: 2500 - 300 = 2200
  assert.strictEqual(weight_loss, 2200, "Weight loss should be TDEE - 300");

  // maintenance: 2500 + 0 = 2500
  assert.strictEqual(maintenance_target, 2500, "Maintenance should be TDEE + 0");

  // muscle_gain: 2500 + 300 = 2800
  assert.strictEqual(muscle_gain, 2800, "Muscle gain should be TDEE + 300");
});

test("Nutrition - Macros calculation (weight loss)", (t) => {
  const target_calories = 2000;
  const weight_kg = 80;

  const macros = calculateMacros(target_calories, weight_kg, "weight_loss");

  // Protein: 80 * 1.6 = 128 g
  assert.strictEqual(macros.protein_g, 128, "Weight loss protein should be 1.6 g/kg");

  // Fat: 2000 * 0.25 / 9 = 500 / 9 = 55.56 g
  assert.strictEqual(macros.fat_g, 55.56, "Fat should be 25% of calories");

  // Carbs: (2000 - 128*4 - 500) / 4 = (2000 - 512 - 500) / 4 = 988 / 4 = 247 g
  assert.strictEqual(macros.carbohydrates_g, 247, "Carbs should be remaining calories");
});

test("Nutrition - Macros calculation (muscle gain)", (t) => {
  const target_calories = 2500;
  const weight_kg = 75;

  const macros = calculateMacros(target_calories, weight_kg, "muscle_gain");

  // Protein: 75 * 1.8 = 135 g
  assert.strictEqual(macros.protein_g, 135, "Muscle gain protein should be 1.8 g/kg");

  // Fat: 2500 * 0.25 / 9 = 625 / 9 = 69.44 g
  assert.strictEqual(macros.fat_g, 69.44, "Fat should be 25% of calories");

  // Carbs: (2500 - 135*4 - 625) / 4 = (2500 - 540 - 625) / 4 = 1335 / 4 = 333.75 g
  assert.strictEqual(macros.carbohydrates_g, 333.75, "Carbs should be remaining calories");
});

test("Nutrition - Full calculation", (t) => {
  const profile: NutritionProfile = {
    age: 30,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderately_active",
    goal: "weight_loss",
  };

  const targets = calculateNutritionTargets(profile);

  assert.ok(targets.bmr > 0, "BMR should be positive");
  assert.ok(targets.maintenance_calories > targets.target_calories, "Maintenance should exceed weight loss target");
  assert.ok(targets.target_protein_g > 0, "Protein should be positive");
  assert.ok(targets.target_carbohydrates_g >= 0, "Carbs should be non-negative");
  assert.ok(targets.target_fat_g > 0, "Fat should be positive");
});

test("Nutrition - Profile validation (valid)", (t) => {
  const profile: NutritionProfile = {
    age: 30,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderately_active",
    goal: "maintenance",
  };

  const validation = validateProfile(profile);
  assert.strictEqual(validation.valid, true, "Valid profile should pass validation");
  assert.strictEqual(validation.errors.length, 0, "No errors should be present");
});

test("Nutrition - Profile validation (invalid age)", (t) => {
  const profile: Partial<NutritionProfile> = {
    age: 200,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "moderately_active",
    goal: "maintenance",
  };

  const validation = validateProfile(profile);
  assert.strictEqual(validation.valid, false, "Invalid age should fail validation");
  assert.ok(validation.errors.length > 0, "Error messages should be present");
});

test("Nutrition - Profile validation (invalid weight)", (t) => {
  const profile: Partial<NutritionProfile> = {
    age: 30,
    gender: "male",
    height_cm: 180,
    weight_kg: 700,
    activity_level: "moderately_active",
    goal: "maintenance",
  };

  const validation = validateProfile(profile);
  assert.strictEqual(validation.valid, false, "Invalid weight should fail validation");
});

test("Nutrition - Profile validation (invalid activity level)", (t) => {
  const profile: Partial<NutritionProfile> = {
    age: 30,
    gender: "male",
    height_cm: 180,
    weight_kg: 80,
    activity_level: "super_active" as any,
    goal: "maintenance",
  };

  const validation = validateProfile(profile);
  assert.strictEqual(validation.valid, false, "Invalid activity level should fail validation");
});
