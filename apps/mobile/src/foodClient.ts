import { authClient } from "./authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface FoodCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface Food {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  serving_size: number;
  serving_unit: string;
  calories_per_serving: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
}

export interface SearchResult {
  foods: Food[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

class FoodClient {
  async getCategories(): Promise<FoodCategory[]> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/foods/categories`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    return data.data;
  }

  async searchFoods(query?: string, categoryId?: number, limit: number = 50, offset: number = 0): Promise<SearchResult> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const params = new URLSearchParams();
    if (query) {
      params.append("q", query);
    }
    if (categoryId) {
      params.append("category", categoryId.toString());
    }
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await fetch(`${API_URL}/api/foods?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to search foods");
    }

    const data = await response.json();
    return {
      foods: data.data,
      pagination: data.pagination,
    };
  }

  async getFoodById(foodId: number): Promise<Food> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/foods/${foodId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch food");
    }

    const data = await response.json();
    return data.data;
  }

  async getFoodsByCategory(categoryId: number, limit: number = 50, offset: number = 0): Promise<SearchResult & { category: FoodCategory }> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await fetch(`${API_URL}/api/foods/category/${categoryId}?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch foods by category");
    }

    const data = await response.json();
    return {
      foods: data.data,
      pagination: data.pagination,
      category: data.category,
    };
  }
}

export const foodClient = new FoodClient();
