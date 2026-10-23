import { Pool } from "pg";

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

export class ShoppingListService {
  constructor(private pool: Pool) {}

  async getItems(userId: number): Promise<ShoppingListItem[]> {
    const result = await this.pool.query(
      `SELECT *
       FROM shopping_list_items
       WHERE user_id = $1
       ORDER BY is_checked ASC, name ASC, created_at ASC`,
      [userId]
    );
    return result.rows;
  }

  async getItemById(userId: number, itemId: number): Promise<ShoppingListItem | null> {
    const result = await this.pool.query(
      `SELECT *
       FROM shopping_list_items
       WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );
    return result.rows[0] || null;
  }

  async createItem(
    userId: number,
    name: string,
    quantityValue: number | null,
    quantityUnit: string | null,
    isChecked: boolean
  ): Promise<ShoppingListItem> {
    const result = await this.pool.query(
      `INSERT INTO shopping_list_items (
         user_id, name, quantity_value, quantity_unit, is_checked
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, quantityValue, quantityUnit, isChecked]
    );
    return result.rows[0];
  }

  async updateItem(
    userId: number,
    itemId: number,
    name: string,
    quantityValue: number | null,
    quantityUnit: string | null,
    isChecked: boolean
  ): Promise<ShoppingListItem> {
    const result = await this.pool.query(
      `UPDATE shopping_list_items SET
         name = $2,
         quantity_value = $3,
         quantity_unit = $4,
         is_checked = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $6
       RETURNING *`,
      [itemId, name, quantityValue, quantityUnit, isChecked, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("Shopping list item not found");
    }

    return result.rows[0];
  }

  async deleteItem(userId: number, itemId: number): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM shopping_list_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("Shopping list item not found");
    }
  }
}