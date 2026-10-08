-- 003_create_food_database.sql

CREATE TABLE IF NOT EXISTS food_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES food_categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  serving_size DECIMAL(8, 2) NOT NULL CHECK (serving_size > 0),
  serving_unit VARCHAR(50) NOT NULL,
  calories_per_serving DECIMAL(8, 2) NOT NULL CHECK (calories_per_serving >= 0),
  protein_g DECIMAL(8, 2) NOT NULL CHECK (protein_g >= 0),
  carbohydrates_g DECIMAL(8, 2) NOT NULL CHECK (carbohydrates_g >= 0),
  fat_g DECIMAL(8, 2) NOT NULL CHECK (fat_g >= 0),
  fiber_g DECIMAL(8, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_foods_category_id ON foods(category_id);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_name_tsvector ON foods USING GIN(to_tsvector('english', name));

-- Seed categories
INSERT INTO food_categories (name, description) VALUES
('Grains & Cereals', 'Whole grains, cereals, and grain-based foods'),
('Rice', 'Various types of rice'),
('Roti & Breads', 'Indian breads and flatbreads'),
('Dal & Legumes', 'Pulses and legume-based dishes'),
('Vegetables', 'Fresh and cooked vegetables'),
('Fruits', 'Fresh fruits'),
('Dairy', 'Milk, yogurt, paneer, and dairy products'),
('Eggs', 'Eggs and egg-based dishes'),
('Meat & Fish', 'Chicken, mutton, fish, and meat products'),
('Nuts & Seeds', 'Nuts, seeds, and nut butters'),
('Snacks', 'Snacks and convenience foods'),
('Beverages', 'Drinks and beverages'),
('Other', 'Other foods')
ON CONFLICT (name) DO NOTHING;

-- Seed curated food data
INSERT INTO foods (category_id, name, description, serving_size, serving_unit, calories_per_serving, protein_g, carbohydrates_g, fat_g, fiber_g) VALUES

-- Grains & Cereals
(1, 'Oatmeal', 'Rolled oats, dry', 30, 'g', 110, 5, 19, 2, 2.7),
(1, 'Cornflakes', 'Dry cereal', 30, 'g', 110, 2.5, 26, 0.5, 1),
(1, 'Wheat Bran', 'Raw wheat bran', 30, 'g', 60, 4.5, 17, 1, 6.5),

-- Rice
(2, 'White Rice', 'Cooked, boiled', 150, 'g', 130, 2.7, 28, 0.3, 0.4),
(2, 'Brown Rice', 'Cooked, boiled', 150, 'g', 110, 2.6, 23, 0.9, 1.8),
(2, 'Basmati Rice', 'Cooked, boiled', 150, 'g', 125, 2.6, 28, 0.2, 0.4),
(2, 'Jasmine Rice', 'Cooked, boiled', 150, 'g', 130, 2.7, 28, 0.3, 0.4),

-- Roti & Breads
(3, 'Roti (Chapati)', 'Whole wheat flour, thin', 30, 'g', 80, 2.7, 14, 0.6, 2.2),
(3, 'Paratha', 'Whole wheat, fried', 60, 'g', 190, 4, 23, 10, 4),
(3, 'Naan', 'Wheat flour, tandoor-baked', 90, 'g', 270, 9, 50, 4, 2),
(3, 'Pita Bread', 'Whole wheat', 52, 'g', 140, 5, 27, 1.5, 4.5),
(3, 'Brown Bread', 'Whole wheat loaf', 30, 'g', 75, 2.5, 14, 0.8, 2),

-- Dal & Legumes
(4, 'Moong Dal', 'Cooked, boiled', 200, 'g', 106, 7.5, 19, 0.4, 6),
(4, 'Chana Dal', 'Cooked, boiled', 200, 'g', 134, 11, 24, 1, 6.5),
(4, 'Masoor Dal', 'Cooked, boiled', 200, 'g', 116, 9, 20, 0.4, 8),
(4, 'Chickpeas', 'Cooked, boiled', 200, 'g', 210, 15, 35, 3.5, 9.5),
(4, 'Rajma (Kidney Beans)', 'Cooked, boiled', 200, 'g', 130, 9, 23, 0.5, 6),
(4, 'Lentils', 'Cooked, boiled', 200, 'g', 116, 9, 20, 0.4, 7.8),

-- Vegetables
(5, 'Spinach', 'Raw', 30, 'g', 7, 0.9, 1.1, 0.1, 0.7),
(5, 'Broccoli', 'Raw', 91, 'g', 34, 2.8, 7, 0.4, 1.5),
(5, 'Carrot', 'Raw', 61, 'g', 26, 0.6, 6, 0.2, 1.7),
(5, 'Tomato', 'Raw', 123, 'g', 21, 1, 5, 0.2, 1.5),
(5, 'Onion', 'Raw', 100, 'g', 40, 1.1, 9, 0.1, 1.7),
(5, 'Potato', 'Boiled, peeled', 150, 'g', 103, 1.7, 24, 0.1, 2.1),
(5, 'Bell Pepper', 'Raw', 119, 'g', 30, 0.9, 7, 0.3, 2.2),
(5, 'Cucumber', 'Raw', 104, 'g', 16, 0.7, 4, 0.1, 0.5),
(5, 'Cabbage', 'Raw', 89, 'g', 22, 1.1, 5, 0.1, 2.2),
(5, 'Cauliflower', 'Raw', 100, 'g', 25, 1.9, 5, 0.3, 2.4),
(5, 'Peas', 'Cooked, boiled', 160, 'g', 125, 8.2, 23, 0.4, 4.4),

-- Fruits
(6, 'Banana', 'Medium, 118g', 118, 'g', 105, 1.3, 27, 0.3, 3.1),
(6, 'Apple', 'Medium with skin, 182g', 182, 'g', 95, 0.5, 25, 0.3, 4.4),
(6, 'Orange', 'Medium, 154g', 154, 'g', 72, 1.4, 18, 0.2, 3.1),
(6, 'Mango', 'Medium, sliced, 165g', 165, 'g', 99, 1.4, 25, 0.6, 2.6),
(6, 'Grapes', 'Red or green, 92g cup', 92, 'g', 62, 0.6, 16, 0.3, 0.9),
(6, 'Strawberries', '152g cup', 152, 'g', 49, 1, 12, 0.5, 3),
(6, 'Watermelon', 'Diced, 152g cup', 152, 'g', 46, 0.9, 12, 0.2, 0.6),

-- Dairy
(7, 'Milk', 'Whole, 240ml', 240, 'ml', 149, 7.7, 12, 8, 0),
(7, 'Yogurt', 'Plain, full-fat, 200g', 200, 'g', 138, 7, 10, 7.5, 0),
(7, 'Paneer', 'Homemade, 30g', 30, 'g', 110, 8.4, 0.4, 8.5, 0),
(7, 'Cheese', 'Cheddar, 28g', 28, 'g', 113, 7, 0.7, 9.3, 0),
(7, 'Cream', 'Heavy, 15ml', 15, 'ml', 51, 0.3, 0.4, 5.5, 0),

-- Eggs
(8, 'Egg', 'Large, boiled', 50, 'g', 78, 6.3, 0.6, 5.3, 0),
(8, 'Egg White', 'Large', 33, 'g', 17, 3.6, 0.7, 0.1, 0),
(8, 'Egg Yolk', 'Large', 17, 'g', 55, 2.7, 0.6, 4.5, 0),

-- Meat & Fish
(9, 'Chicken Breast', 'Skinless, boiled, 100g', 100, 'g', 165, 31, 0, 3.6, 0),
(9, 'Chicken Thigh', 'Skinless, boiled, 100g', 100, 'g', 209, 26, 0, 11, 0),
(9, 'Mutton', 'Cooked, lean, 100g', 100, 'g', 175, 30, 0, 6, 0),
(9, 'Fish (Salmon)', 'Cooked, 100g', 100, 'g', 206, 22, 0, 13, 0),
(9, 'Fish (Tilapia)', 'Cooked, 100g', 100, 'g', 128, 26, 0, 2.7, 0),
(9, 'Fish (Rohu)', 'Cooked, 100g', 100, 'g', 140, 27, 0, 3, 0),
(9, 'Shrimp', 'Boiled, 100g', 100, 'g', 99, 24, 0, 0.3, 0),

-- Nuts & Seeds
(10, 'Almonds', '23 nuts, 28g', 28, 'g', 164, 6, 6, 14, 3.5),
(10, 'Peanuts', 'Oil roasted, 32g', 32, 'g', 188, 8.6, 6.5, 16, 2.5),
(10, 'Cashews', '18 medium nuts, 28g', 28, 'g', 155, 5.2, 9, 12, 1),
(10, 'Walnuts', '14 halves, 28g', 28, 'g', 185, 4.3, 4, 18.5, 1.9),
(10, 'Sesame Seeds', '1 tbsp, 9g', 9, 'g', 52, 1.6, 2, 4.7, 1.1),
(10, 'Sunflower Seeds', '2 tbsp, 18g', 18, 'g', 103, 3.7, 3.6, 9, 2.4),

-- Snacks
(11, 'Samosa', 'Fried, one piece', 60, 'g', 180, 3, 20, 10, 1),
(11, 'Namkeen Mix', 'Typical mixture, 30g', 30, 'g', 153, 4, 15, 8, 0.5),
(11, 'Popcorn', 'Oil-popped, 10g', 10, 'g', 55, 1.7, 5.5, 3.2, 1),

-- Beverages
(12, 'Tea', 'Black tea with milk, 200ml', 200, 'ml', 35, 1, 5, 1, 0),
(12, 'Coffee', 'With milk, 200ml', 200, 'ml', 15, 1, 1, 1, 0),
(12, 'Orange Juice', 'Freshly squeezed, 240ml', 240, 'ml', 110, 2, 26, 0.5, 2.4),
(12, 'Coconut Water', 'Raw, 240ml', 240, 'ml', 46, 2.2, 9, 0.2, 2.6),

-- Other
(13, 'Butter', 'Salted, 14g', 14, 'g', 102, 0.1, 0, 11.5, 0),
(13, 'Olive Oil', '1 tbsp, 15ml', 15, 'ml', 119, 0, 0, 13.5, 0),
(13, 'Honey', '1 tbsp, 21g', 21, 'g', 64, 0, 17, 0, 0),
(13, 'Sugar', '1 tsp, 4g', 4, 'g', 16, 0, 4, 0, 0)
ON CONFLICT DO NOTHING;
