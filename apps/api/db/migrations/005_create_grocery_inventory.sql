-- 005_create_grocery_inventory.sql

CREATE TABLE IF NOT EXISTS grocery_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id INTEGER NULL REFERENCES foods(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  quantity_value DECIMAL(10, 2) NOT NULL CHECK (quantity_value >= 0),
  quantity_unit VARCHAR(50) NOT NULL,
  expiry_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_user_id ON grocery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_user_food ON grocery_items(user_id, food_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_expiry_date ON grocery_items(expiry_date);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity_value DECIMAL(10, 2) NULL CHECK (quantity_value IS NULL OR quantity_value >= 0),
  quantity_unit VARCHAR(50) NULL,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user_id ON shopping_list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_user_checked ON shopping_list_items(user_id, is_checked);
