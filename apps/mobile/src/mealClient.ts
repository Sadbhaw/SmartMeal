import { authClient } from "./authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface MealType {
  id: number;
  name: string;
  display_order: number;
}

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

class MealClient {
  async getMealTypes(): Promise<MealType[]> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals/types`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch meal types");
    }

    const data = await response.json();
    return data.data;
  }

  async createMealEntry(
    foodId: number,
    mealTypeId: number,
    quantityValue: number,
    quantityUnit: string,
    loggedDate: string,
    loggedTime?: string
  ): Promise<MealEntry> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        food_id: foodId,
        meal_type_id: mealTypeId,
        quantity_value: quantityValue,
        quantity_unit: quantityUnit,
        logged_date: loggedDate,
        logged_time: loggedTime || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create meal entry");
    }

    const data = await response.json();
    return data.data;
  }

  async getMealsForDate(date: string): Promise<MealEntryWithDetails[]> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals?date=${date}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch meals");
    }

    const data = await response.json();
    return data.data;
  }

  async getDailyNutritionSummary(date: string): Promise<DailyNutritionSummary> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals/summary?date=${date}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch nutrition summary");
    }

    const data = await response.json();
    return data.data;
  }

  async getMealEntryById(entryId: number): Promise<MealEntryWithDetails> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals/${entryId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Meal entry not found");
      }
      throw new Error("Failed to fetch meal entry");
    }

    const data = await response.json();
    return data.data;
  }

  async updateMealEntry(
    entryId: number,
    foodId: number,
    mealTypeId: number,
    quantityValue: number,
    quantityUnit: string,
    loggedDate: string,
    loggedTime?: string
  ): Promise<MealEntry> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals/${entryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        food_id: foodId,
        meal_type_id: mealTypeId,
        quantity_value: quantityValue,
        quantity_unit: quantityUnit,
        logged_date: loggedDate,
        logged_time: loggedTime || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update meal entry");
    }

    const data = await response.json();
    return data.data;
  }

  async deleteMealEntry(entryId: number): Promise<void> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/meals/${entryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete meal entry");
    }
  }
}

export const mealClient = new MealClient();
