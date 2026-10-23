import { Pool } from "pg";

export interface GroceryItem {
  id: number;
  user_id: number;
  food_id: number | null;
  name: string;
  quantity_value: number;
  quantity_unit: string;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroceryItemWithFood extends GroceryItem {
  food_name: string | null;
  food_serving_size: number | null;
  food_serving_unit: string | null;
}

const GROCERY_SELECT = `
  SELECT
    gi.id,
    gi.user_id,
    gi.food_id,
    gi.name,
    gi.quantity_value,
    gi.quantity_unit,
    TO_CHAR(gi.expiry_date, 'YYYY-MM-DD') AS expiry_date,
    gi.notes,
    gi.created_at,
    gi.updated_at,
    f.name AS food_name,
    f.serving_size AS food_serving_size,
    f.serving_unit AS food_serving_unit
  FROM grocery_items gi
  LEFT JOIN foods f ON gi.food_id = f.id
`;

export class GroceryService {
  constructor(private pool: Pool) {}

  async getItems(userId: number): Promise<GroceryItemWithFood[]> {
    const result = await this.pool.query(
      `${GROCERY_SELECT}
       WHERE gi.user_id = $1
       ORDER BY gi.name ASC, gi.created_at ASC`,
      [userId]
    );
    return result.rows;
  }

  async getItemById(userId: number, itemId: number): Promise<GroceryItemWithFood | null> {
    const result = await this.pool.query(
      `${GROCERY_SELECT}
       WHERE gi.id = $1 AND gi.user_id = $2`,
      [itemId, userId]
    );
    return result.rows[0] || null;
  }

  async createItem(
    userId: number,
    name: string,
    quantityValue: number,
    quantityUnit: string,
    foodId: number | null,
    expiryDate: string | null,
    notes: string | null
  ): Promise<GroceryItem> {
    const result = await this.pool.query(
      `INSERT INTO grocery_items (
        user_id, food_id, name, quantity_value, quantity_unit, expiry_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, food_id, name, quantity_value, quantity_unit,
               TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date,
               notes, created_at, updated_at`,
      [userId, foodId, name, quantityValue, quantityUnit, expiryDate, notes]
    );
    return result.rows[0];
  }

  async updateItem(
    userId: number,
    itemId: number,
    name: string,
    quantityValue: number,
    quantityUnit: string,
    foodId: number | null,
    expiryDate: string | null,
    notes: string | null
  ): Promise<GroceryItem> {
    const result = await this.pool.query(
      `UPDATE grocery_items SET
        name = $2,
        quantity_value = $3,
        quantity_unit = $4,
        food_id = $5,
        expiry_date = $6,
        notes = $7,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $8
       RETURNING id, user_id, food_id, name, quantity_value, quantity_unit,
                TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date,
                notes, created_at, updated_at`,
      [itemId, name, quantityValue, quantityUnit, foodId, expiryDate, notes, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("Grocery item not found");
    }

    return result.rows[0];
  }

  async deleteItem(userId: number, itemId: number): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM grocery_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error("Grocery item not found");
    }
  }
}
