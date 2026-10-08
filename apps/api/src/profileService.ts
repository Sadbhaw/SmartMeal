import { Pool } from "pg";
import { calculateNutritionTargets, NutritionProfile, NutritionTargets } from "./nutrition.js";

export class ProfileService {
  constructor(private pool: Pool) {}

  async createProfile(userId: number, profile: NutritionProfile): Promise<NutritionProfile & NutritionTargets> {
    const targets = calculateNutritionTargets(profile);

    const result = await this.pool.query(
      `INSERT INTO user_profiles (
        user_id, age, gender, height_cm, weight_kg, activity_level, goal,
        bmr, maintenance_calories, target_calories, target_protein_g,
        target_carbohydrates_g, target_fat_g
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        userId,
        profile.age,
        profile.gender,
        profile.height_cm,
        profile.weight_kg,
        profile.activity_level,
        profile.goal,
        targets.bmr,
        targets.maintenance_calories,
        targets.target_calories,
        targets.target_protein_g,
        targets.target_carbohydrates_g,
        targets.target_fat_g,
      ]
    );

    return result.rows[0];
  }

  async getProfile(userId: number): Promise<(NutritionProfile & NutritionTargets) | null> {
    const result = await this.pool.query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async updateProfile(userId: number, profile: Partial<NutritionProfile>): Promise<NutritionProfile & NutritionTargets> {
    // Get existing profile
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new Error("Profile not found");
    }

    // Merge with existing data
    const merged: NutritionProfile = {
      age: profile.age || existing.age,
      gender: (profile.gender as any) || existing.gender,
      height_cm: profile.height_cm || existing.height_cm,
      weight_kg: profile.weight_kg || existing.weight_kg,
      activity_level: (profile.activity_level as any) || existing.activity_level,
      goal: (profile.goal as any) || existing.goal,
    };

    // Recalculate nutrition targets
    const targets = calculateNutritionTargets(merged);

    const result = await this.pool.query(
      `UPDATE user_profiles SET
        age = $2, gender = $3, height_cm = $4, weight_kg = $5,
        activity_level = $6, goal = $7,
        bmr = $8, maintenance_calories = $9, target_calories = $10,
        target_protein_g = $11, target_carbohydrates_g = $12, target_fat_g = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *`,
      [
        userId,
        merged.age,
        merged.gender,
        merged.height_cm,
        merged.weight_kg,
        merged.activity_level,
        merged.goal,
        targets.bmr,
        targets.maintenance_calories,
        targets.target_calories,
        targets.target_protein_g,
        targets.target_carbohydrates_g,
        targets.target_fat_g,
      ]
    );

    return result.rows[0];
  }

  async profileExists(userId: number): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM user_profiles WHERE user_id = $1`,
      [userId]
    );
    return result.rows.length > 0;
  }
}
