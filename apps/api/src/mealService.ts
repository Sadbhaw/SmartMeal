import { Pool } from "pg";

export interface MealEntry {
  id: number;
  user_id: number;
  food_id: number;
  meal_type_id: number;
  quantity_value: number;
  quantity_unit: string;
  logged_date: string;
  logged_time: string | null;
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface MealEntryWithDetails extends MealEntry {
  food_name: string;
  meal_type_name: string;
  food_serving_size: number;
  food_serving_unit: string;
}

export interface DailyNutritionSummary {
  date: string;
  consumed: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
    fiber_g: number;
  };
  targets: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  } | null;
  remaining: {
    calories: number;
    protein_g: number;
    carbohydrates_g: number;
    fat_g: number;
  } | null;
}

export class MealService {
  constructor(private pool: Pool) {}

  async createMealEntry(
    userId: number,
    foodId: number,
    mealTypeId: number,
    quantityValue: number,
    quantityUnit: string,
    loggedDate: string,
    loggedTime?: string
  ): Promise<MealEntry> {
    // Validate date is not in future
    const today = new Date().toISOString().split("T")[0];
    if (loggedDate > today) {
      throw new Error("Cannot log meals for future dates");
    }

    // Get food nutrition values from database
    const foodResult = await this.pool.query(
      `SELECT calories_per_serving, protein_g, carbohydrates_g, fat_g, fiber_g, serving_size 
       FROM foods WHERE id = $1`,
      [foodId]
    );

    if (foodResult.rows.length === 0) {
      throw new Error("Food not found");
    }

    const food = foodResult.rows[0];

    // Calculate nutrition for the quantity consumed
    const servingMultiplier = quantityValue / food.serving_size;
    const calories = Math.round(food.calories_per_serving * servingMultiplier * 100) / 100;
    const protein = Math.round(food.protein_g * servingMultiplier * 100) / 100;
    const carbs = Math.round(food.carbohydrates_g * servingMultiplier * 100) / 100;
    const fat = Math.round(food.fat_g * servingMultiplier * 100) / 100;
    const fiber = food.fiber_g ? Math.round(food.fiber_g * servingMultiplier * 100) / 100 : null;

    // Insert meal entry with calculated nutrition
    const result = await this.pool.query(
      `INSERT INTO meal_entries (
        user_id, food_id, meal_type_id, quantity_value, quantity_unit,
        logged_date, logged_time, calories, protein_g, carbohydrates_g, fat_g, fiber_g
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        foodId,
        mealTypeId,
        quantityValue,
        quantityUnit,
        loggedDate,
        loggedTime || null,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      ]
    );

    return result.rows[0];
  }

  async getMealEntriesForDate(userId: number, date: string): Promise<MealEntryWithDetails[]> {
    const result = await this.pool.query(
      `SELECT 
        me.*,
        f.name as food_name,
        mt.name as meal_type_name,
        f.serving_size as food_serving_size,
        f.serving_unit as food_serving_unit
       FROM meal_entries me
       JOIN foods f ON me.food_id = f.id
       JOIN meal_types mt ON me.meal_type_id = mt.id
       WHERE me.user_id = $1 AND me.logged_date = $2
       ORDER BY mt.display_order ASC, me.logged_time ASC NULLS LAST, me.created_at ASC`,
      [userId, date]
    );

    return result.rows;
  }

  async getMealEntryById(userId: number, entryId: number): Promise<MealEntryWithDetails | null> {
    const result = await this.pool.query(
      `SELECT 
        me.*,
        f.name as food_name,
        mt.name as meal_type_name,
        f.serving_size as food_serving_size,
        f.serving_unit as food_serving_unit
       FROM meal_entries me
       JOIN foods f ON me.food_id = f.id
       JOIN meal_types mt ON me.meal_type_id = mt.id
       WHERE me.id = $1 AND me.user_id = $2`,
      [entryId, userId]
    );

    return result.rows[0] || null;
  }

  async updateMealEntry(
    userId: number,
    entryId: number,
    foodId: number,
    mealTypeId: number,
    quantityValue: number,
    quantityUnit: string,
    loggedDate: string,
    loggedTime?: string
  ): Promise<MealEntry> {
    // Verify entry belongs to user
    const existing = await this.pool.query(
      `SELECT id FROM meal_entries WHERE id = $1 AND user_id = $2`,
      [entryId, userId]
    );

    if (existing.rows.length === 0) {
      throw new Error("Meal entry not found");
    }

    // Validate date is not in future
    const today = new Date().toISOString().split("T")[0];
    if (loggedDate > today) {
      throw new Error("Cannot log meals for future dates");
    }

    // Get food nutrition values
    const foodResult = await this.pool.query(
      `SELECT calories_per_serving, protein_g, carbohydrates_g, fat_g, fiber_g, serving_size 
       FROM foods WHERE id = $1`,
      [foodId]
    );

    if (foodResult.rows.length === 0) {
      throw new Error("Food not found");
    }

    const food = foodResult.rows[0];

    // Calculate nutrition for the quantity
    const servingMultiplier = quantityValue / food.serving_size;
    const calories = Math.round(food.calories_per_serving * servingMultiplier * 100) / 100;
    const protein = Math.round(food.protein_g * servingMultiplier * 100) / 100;
    const carbs = Math.round(food.carbohydrates_g * servingMultiplier * 100) / 100;
    const fat = Math.round(food.fat_g * servingMultiplier * 100) / 100;
    const fiber = food.fiber_g ? Math.round(food.fiber_g * servingMultiplier * 100) / 100 : null;

    // Update entry
    const result = await this.pool.query(
      `UPDATE meal_entries SET
        food_id = $2,
        meal_type_id = $3,
        quantity_value = $4,
        quantity_unit = $5,
        logged_date = $6,
        logged_time = $7,
        calories = $8,
        protein_g = $9,
        carbohydrates_g = $10,
        fat_g = $11,
        fiber_g = $12,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        entryId,
        foodId,
        mealTypeId,
        quantityValue,
        quantityUnit,
        loggedDate,
        loggedTime || null,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      ]
    );

    return result.rows[0];
  }

  async deleteMealEntry(userId: number, entryId: number): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM meal_entries WHERE id = $1 AND user_id = $2`,
      [entryId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("Meal entry not found");
    }
  }

  async getDailyNutritionSummary(userId: number, date: string): Promise<DailyNutritionSummary> {
    // Get consumed totals from meal_entries
    const consumedResult = await this.pool.query(
      `SELECT
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein_g), 0) as total_protein_g,
        COALESCE(SUM(carbohydrates_g), 0) as total_carbohydrates_g,
        COALESCE(SUM(fat_g), 0) as total_fat_g,
        COALESCE(SUM(fiber_g), 0) as total_fiber_g
       FROM meal_entries
       WHERE user_id = $1 AND logged_date = $2`,
      [userId, date]
    );

    const consumed = consumedResult.rows[0];
    const consumedCalories = parseFloat(consumed.total_calories);
    const consumedProtein = parseFloat(consumed.total_protein_g);
    const consumedCarbs = parseFloat(consumed.total_carbohydrates_g);
    const consumedFat = parseFloat(consumed.total_fat_g);
    const consumedFiber = parseFloat(consumed.total_fiber_g);

    // Get user's profile targets
    const profileResult = await this.pool.query(
      `SELECT target_calories, target_protein_g, target_carbohydrates_g, target_fat_g
       FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    let targets: DailyNutritionSummary["targets"] = null;
    let remaining: DailyNutritionSummary["remaining"] = null;

    if (profileResult.rows.length > 0) {
      const profile = profileResult.rows[0];
      const targetCalories = parseFloat(profile.target_calories);
      const targetProtein = parseFloat(profile.target_protein_g);
      const targetCarbs = parseFloat(profile.target_carbohydrates_g);
      const targetFat = parseFloat(profile.target_fat_g);

      targets = {
        calories: targetCalories,
        protein_g: targetProtein,
        carbohydrates_g: targetCarbs,
        fat_g: targetFat,
      };

      remaining = {
        calories: Math.round((targetCalories - consumedCalories) * 100) / 100,
        protein_g: Math.round((targetProtein - consumedProtein) * 100) / 100,
        carbohydrates_g: Math.round((targetCarbs - consumedCarbs) * 100) / 100,
        fat_g: Math.round((targetFat - consumedFat) * 100) / 100,
      };
    }

    return {
      date,
      consumed: {
        calories: consumedCalories,
        protein_g: consumedProtein,
        carbohydrates_g: consumedCarbs,
        fat_g: consumedFat,
        fiber_g: consumedFiber,
      },
      targets,
      remaining,
    };
  }

  async getMealTypes() {
    const result = await this.pool.query(
      `SELECT id, name, display_order FROM meal_types ORDER BY display_order ASC`
    );
    return result.rows;
  }
}
