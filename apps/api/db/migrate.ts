import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async (pool: Pool): Promise<void> => {
  // Create migrations table if it doesn''t exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get all migration files
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Run each migration that hasn''t been applied
  for (const file of files) {
    const result = await pool.query("SELECT * FROM migrations WHERE name = $1", [file]);

    if (result.rows.length === 0) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      try {
        await pool.query(sql);
        await pool.query("INSERT INTO migrations (name) VALUES ($1)", [file]);
        console.log(`✓ Migration completed: ${file}`);
      } catch (err) {
        console.error(`✗ Migration failed: ${file}`, err);
        throw err;
      }
    }
  }
};

export { runMigrations };
