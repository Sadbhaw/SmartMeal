-- 004_create_meal_tracking.sql

CREATE TABLE IF NOT EXISTS meal_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed meal types
INSERT INTO meal_types (name, display_order) VALUES
('Breakfast', 1),
('Lunch', 2),
('Dinner', 3),
('Snacks', 4)
ON CONFLICT (name) DO NOTHING;

-- Function must be defined BEFORE trigger creation
CREATE OR REPLACE FUNCTION check_logged_date_not_future()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logged_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'logged_date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS meal_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
  meal_type_id INTEGER NOT NULL REFERENCES meal_types(id) ON DELETE RESTRICT,
  quantity_value DECIMAL(10, 2) NOT NULL CHECK (quantity_value > 0),
  quantity_unit VARCHAR(50) NOT NULL,
  logged_date DATE NOT NULL,
  logged_time TIME,
  calories DECIMAL(10, 2) NOT NULL CHECK (calories >= 0),
  protein_g DECIMAL(10, 2) NOT NULL CHECK (protein_g >= 0),
  carbohydrates_g DECIMAL(10, 2) NOT NULL CHECK (carbohydrates_g >= 0),
  fat_g DECIMAL(10, 2) NOT NULL CHECK (fat_g >= 0),
  fiber_g DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meal_entries_user_id ON meal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_entries_logged_date ON meal_entries(logged_date);
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_date ON meal_entries(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_meal_entries_meal_type_id ON meal_entries(meal_type_id);

-- Create trigger AFTER function exists
DROP TRIGGER IF EXISTS ensure_logged_date_not_future ON meal_entries;
CREATE CONSTRAINT TRIGGER ensure_logged_date_not_future
AFTER INSERT OR UPDATE ON meal_entries
FOR EACH ROW
EXECUTE FUNCTION check_logged_date_not_future();
