import { Pool, QueryResult } from "pg";

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

export class FoodService {
  constructor(private pool: Pool) {}

  async getCategories(): Promise<FoodCategory[]> {
    const result = await this.pool.query(
      `SELECT id, name, description FROM food_categories ORDER BY name ASC`
    );
    return result.rows;
  }

  async getCategoryById(categoryId: number): Promise<FoodCategory | null> {
    const result = await this.pool.query(
      `SELECT id, name, description FROM food_categories WHERE id = $1`,
      [categoryId]
    );
    return result.rows[0] || null;
  }

  async searchFoods(
    query?: string,
    categoryId?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ foods: Food[]; total: number }> {
    let sql = `SELECT * FROM foods WHERE 1=1`;
    const params: any[] = [];
    let countSql = `SELECT COUNT(*) FROM foods WHERE 1=1`;

    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      sql += ` AND name ILIKE $${params.length + 1}`;
      countSql += ` AND name ILIKE $${params.length + 1}`;
      params.push(searchTerm);
    }

    if (categoryId) {
      sql += ` AND category_id = $${params.length + 1}`;
      countSql += ` AND category_id = $${params.length + 1}`;
      params.push(categoryId);
    }

    sql += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [foodsResult, countResult] = await Promise.all([
      this.pool.query(sql, params),
      this.pool.query(countSql, params.slice(0, -2)),
    ]);

    return {
      foods: foodsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async getFoodById(foodId: number): Promise<Food | null> {
    const result = await this.pool.query(
      `SELECT * FROM foods WHERE id = $1`,
      [foodId]
    );
    return result.rows[0] || null;
  }

  async getFoodsByIds(foodIds: number[]): Promise<Food[]> {
    if (foodIds.length === 0) {
      return [];
    }

    const placeholders = foodIds.map((_, i) => `$${i + 1}`).join(",");
    const result = await this.pool.query(
      `SELECT * FROM foods WHERE id IN (${placeholders}) ORDER BY name ASC`,
      foodIds
    );
    return result.rows;
  }

  async getFoodsByCategory(categoryId: number, limit: number = 50, offset: number = 0): Promise<{ foods: Food[]; total: number }> {
    const foodsResult = await this.pool.query(
      `SELECT * FROM foods WHERE category_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3`,
      [categoryId, limit, offset]
    );

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM foods WHERE category_id = $1`,
      [categoryId]
    );

    return {
      foods: foodsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }
}
