// Nutrition calculation constants
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

// Goal-specific calorie adjustments (fixed values, not percentages)
const CALORIE_ADJUSTMENTS: Record<string, number> = {
  weight_loss: -300,  // maintenance - 300
  maintenance: 0,     // maintenance
  muscle_gain: 300,   // maintenance + 300
};

// Goal-specific protein targets (grams per kg of body weight)
const PROTEIN_PER_KG: Record<string, number> = {
  weight_loss: 1.6,
  maintenance: 1.6,
  muscle_gain: 1.8,
};

// Fixed fat ratio as percentage of target calories
const FAT_RATIO = 0.25; // 25% of target calories

export interface NutritionProfile {
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  goal: "weight_loss" | "maintenance" | "muscle_gain";
}

export interface NutritionTargets {
  bmr: number;
  maintenance_calories: number;
  target_calories: number;
  target_protein_g: number;
  target_carbohydrates_g: number;
  target_fat_g: number;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export const calculateBMR = (profile: NutritionProfile): number => {
  const { age, gender, height_cm, weight_kg } = profile;

  let bmr: number;

  if (gender === "male") {
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    // female or other
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  return Math.round(bmr * 100) / 100; // Round to 2 decimals
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export const calculateTDEE = (bmr: number, activity_level: string): number => {
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || 1.5;
  const tdee = bmr * multiplier;
  return Math.round(tdee * 100) / 100;
};

/**
 * Calculate target calories based on goal
 * weight_loss: maintenance - 300
 * maintenance: maintenance
 * muscle_gain: maintenance + 300
 */
export const calculateTargetCalories = (tdee: number, goal: string): number => {
  const adjustment = CALORIE_ADJUSTMENTS[goal] || 0;
  const target = tdee + adjustment;
  return Math.round(target * 100) / 100;
};

/**
 * Calculate macro targets (protein, carbs, fat in grams)
 * 
 * Protein: goal-specific per kg of body weight
 * Fat: 25% of target calories
 * Carbs: remaining calories after protein and fat
 */
export const calculateMacros = (
  target_calories: number,
  weight_kg: number,
  goal: string
): { protein_g: number; carbohydrates_g: number; fat_g: number } => {
  // Protein based on goal (1.6 or 1.8 g/kg)
  const protein_per_kg = PROTEIN_PER_KG[goal] || PROTEIN_PER_KG.maintenance;
  const protein_g = weight_kg * protein_per_kg;
  const protein_calories = protein_g * 4; // 4 kcal per gram

  // Fat: 25% of target calories
  const fat_calories = target_calories * FAT_RATIO;
  const fat_g = fat_calories / 9; // 9 kcal per gram

  // Carbs: remaining calories after protein and fat
  const carb_calories = target_calories - protein_calories - fat_calories;
  const carbohydrates_g = Math.max(carb_calories / 4, 0); // 4 kcal per gram

  return {
    protein_g: Math.round(protein_g * 100) / 100,
    carbohydrates_g: Math.round(carbohydrates_g * 100) / 100,
    fat_g: Math.round(fat_g * 100) / 100,
  };
};

/**
 * Calculate all nutrition targets from a profile
 */
export const calculateNutritionTargets = (profile: NutritionProfile): NutritionTargets => {
  const bmr = calculateBMR(profile);
  const maintenance_calories = calculateTDEE(bmr, profile.activity_level);
  const target_calories = calculateTargetCalories(maintenance_calories, profile.goal);
  const macros = calculateMacros(target_calories, profile.weight_kg, profile.goal);

  return {
    bmr,
    maintenance_calories,
    target_calories,
    target_protein_g: macros.protein_g,
    target_carbohydrates_g: macros.carbohydrates_g,
    target_fat_g: macros.fat_g,
  };
};

/**
 * Validate profile inputs
 */
export const validateProfile = (profile: Partial<NutritionProfile>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.age || profile.age <= 0 || profile.age >= 150) {
    errors.push("Age must be between 1 and 149");
  }

  if (!profile.height_cm || profile.height_cm <= 0 || profile.height_cm >= 300) {
    errors.push("Height must be between 1 and 299 cm");
  }

  if (!profile.weight_kg || profile.weight_kg <= 0 || profile.weight_kg >= 600) {
    errors.push("Weight must be between 1 and 599 kg");
  }

  if (!["male", "female", "other"].includes(profile.gender || "")) {
    errors.push("Gender must be male, female, or other");
  }

  if (!["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"].includes(profile.activity_level || "")) {
    errors.push("Activity level must be one of: sedentary, lightly_active, moderately_active, very_active, extra_active");
  }

  if (!["weight_loss", "maintenance", "muscle_gain"].includes(profile.goal || "")) {
    errors.push("Goal must be weight_loss, maintenance, or muscle_gain");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
