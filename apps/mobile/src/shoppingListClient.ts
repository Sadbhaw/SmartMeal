import { authClient } from "./authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export interface ShoppingListItem {
  id: number;
  user_id: number;
  name: string;
  quantity_value: number | null;
  quantity_unit: string | null;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItemInput {
  name: string;
  quantity_value?: number | null;
  quantity_unit?: string | null;
  is_checked?: boolean;
}

class ShoppingListClient {
  async getItems(): Promise<ShoppingListItem[]> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/shopping-list`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch shopping list");
    }

    const data = await response.json();
    return data.data;
  }

  async createItem(input: ShoppingListItemInput): Promise<ShoppingListItem> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/shopping-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: input.name,
        quantity_value: input.quantity_value ?? null,
        quantity_unit: input.quantity_unit ?? null,
        is_checked: input.is_checked ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create shopping list item");
    }

    const data = await response.json();
    return data.data;
  }

  async updateItem(id: number, input: ShoppingListItemInput): Promise<ShoppingListItem> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/shopping-list/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: input.name,
        quantity_value: input.quantity_value ?? null,
        quantity_unit: input.quantity_unit ?? null,
        is_checked: input.is_checked ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update shopping list item");
    }

    const data = await response.json();
    return data.data;
  }

  async deleteItem(id: number): Promise<void> {
    const token = await authClient.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${API_URL}/api/shopping-list/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete shopping list item");
    }
  }
}

export const shoppingListClient = new ShoppingListClient();

export const getShoppingListItems = () => shoppingListClient.getItems();
export const createShoppingListItem = (input: ShoppingListItemInput) =>
  shoppingListClient.createItem(input);
export const updateShoppingListItem = (id: number, input: ShoppingListItemInput) =>
  shoppingListClient.updateItem(id, input);
export const deleteShoppingListItem = (id: number) =>
  shoppingListClient.deleteItem(id);
