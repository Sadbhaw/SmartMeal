import { authClient } from "./authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface NutritionProfile {
  user_id?: number;
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
  created_at?: string;
  updated_at?: string;
}

export type ProfileData = NutritionProfile & NutritionTargets;

class ProfileClient {
  async createProfile(profile: NutritionProfile): Promise<ProfileData> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create profile");
    }

    const data = await response.json();
    return data.data;
  }

  async getProfile(): Promise<ProfileData> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Profile not found");
      }
      throw new Error("Failed to fetch profile");
    }

    const data = await response.json();
    return data.data;
  }

  async updateProfile(profile: Partial<NutritionProfile>): Promise<ProfileData> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    const data = await response.json();
    return data.data;
  }
}

export const profileClient = new ProfileClient();
