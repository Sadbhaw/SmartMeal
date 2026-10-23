import { authClient } from "./authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface InventoryItem {
  id: number;
  user_id: number;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  notes: string | null;
  food_id: number | null;
  food_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemInput {
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: string | null;
  notes?: string | null;
  food_id?: number | null;
}

class GroceryClient {
  async getInventory(): Promise<InventoryItem[]> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/grocery/inventory`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch inventory");
    }

    const data = await response.json();
    return data.data.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity_value),
      unit: item.quantity_unit,
    }));
  }

  async createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/grocery/inventory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: input.name,
        quantity_value: input.quantity,
        quantity_unit: input.unit,
        expiry_date: input.expiry_date || null,
        notes: input.notes || null,
        food_id: input.food_id || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create inventory item");
    }

    const data = await response.json();
    return data.data;
  }

  async updateInventoryItem(id: number, input: InventoryItemInput): Promise<InventoryItem> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/grocery/inventory/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: input.name,
        quantity_value: input.quantity,
        quantity_unit: input.unit,
        expiry_date: input.expiry_date || null,
        notes: input.notes || null,
        food_id: input.food_id || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update inventory item");
    }

    const data = await response.json();
    return data.data;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/grocery/inventory/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete inventory item");
    }
  }
}

export const groceryClient = new GroceryClient();

export const getInventory = () => groceryClient.getInventory();
export const createInventoryItem = (input: InventoryItemInput) =>
  groceryClient.createInventoryItem(input);
export const updateInventoryItem = (id: number, input: InventoryItemInput) =>
  groceryClient.updateInventoryItem(id, input);
export const deleteInventoryItem = (id: number) =>
  groceryClient.deleteInventoryItem(id);
