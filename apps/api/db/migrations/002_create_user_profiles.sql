-- 002_create_user_profiles.sql

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
  gender VARCHAR(50) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  height_cm DECIMAL(6, 2) NOT NULL CHECK (height_cm > 0 AND height_cm < 300),
  weight_kg DECIMAL(6, 2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 600),
  activity_level VARCHAR(50) NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  goal VARCHAR(50) NOT NULL CHECK (goal IN ('weight_loss', 'maintenance', 'muscle_gain')),
  bmr DECIMAL(8, 2) NOT NULL,
  maintenance_calories DECIMAL(8, 2) NOT NULL,
  target_calories DECIMAL(8, 2) NOT NULL,
  target_protein_g DECIMAL(8, 2) NOT NULL,
  target_carbohydrates_g DECIMAL(8, 2) NOT NULL,
  target_fat_g DECIMAL(8, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
