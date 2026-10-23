# SmartMeal Development Roadmap

**Last Updated:** 2026-10-10

This is the permanent master roadmap for SmartMeal development. It defines the complete product vision, the sequence of implementation stages, and the architectural principles that guide all decisions.

## Product Vision

SmartMeal is an AI-powered personalized meal planning application that helps users achieve their health and fitness goals through intelligent nutrition tracking, meal planning, and AI-assisted recommendations.

Users can:
- Create a personal profile with health metrics (age, height, weight, activity level)
- Set goals (weight loss, muscle gain, maintenance)
- Receive personalized calorie and macronutrient targets
- Log meals and track daily nutrition
- Manage a grocery inventory
- Receive AI-assisted meal recommendations
- Plan meals intelligently using available groceries
- Generate smart shopping lists

## Architectural Principles

These principles are permanent and guide all implementation decisions:

1. **Mobile Stack:** React Native + Expo + TypeScript
   - Currently Expo SDK 57
   - Target modern Android and iOS
   - SecureStore for sensitive authentication data

2. **Backend Stack:** Node.js + Fastify + TypeScript
   - REST API architecture
   - Raw PostgreSQL via `pg` driver (no ORM unless explicitly decided later)
   - Environmental configuration validated at startup
   - Consistent error handling without exposing internal details

3. **Database:** PostgreSQL
   - Local development via Docker Compose
   - Persistent named volumes
   - Health checks via pg_isready
   - Deterministic data (no magic)

4. **Authentication & Security**
   - JWT with short-lived access tokens (recommend 15-30 minutes)
   - Server-managed refresh-token sessions
   - Refresh tokens must support: validation, rotation, expiration, revocation
   - Passwords hashed with Argon2id (never plain text, never weak hashing)
   - Secrets never exposed to mobile app
   - Credentials never exposed in API responses

5. **AI Integration**
   - Gemini API accessed ONLY through backend
   - Backend remains authoritative for all nutritional calculations
   - Gemini assists with recommendations but never overrides validated data
   - AI output must be validated before presentation as authoritative information

6. **Food & Nutrition Data**
   - Start with curated, validated food database
   - USDA FoodData Central integration is optional future work
   - Nutrient values must come from validated sources
   - All calculations (BMR, TDEE, macros) are deterministic backend logic

7. **Infrastructure Philosophy**
   - No microservices unless proven necessary
   - No Kubernetes for Stage 0-11
   - Keep deployment simple and maintainable
   - Environment parity: dev, staging, production use same code

8. **Development Discipline**
   - Implement ONE stage per task
   - Each stage must be verified before moving to the next
   - Do not implement future stages early
   - Maintain existing functionality across stages
   - Use version control to track progress

---

## Stage Overview

| Stage | Status | Purpose |
|-------|--------|---------|
| 0 | ✅ COMPLETE | Foundation: Monorepo, Expo, Fastify, PostgreSQL |
| 1 | ✅ COMPLETE | Authentication, JWT, refresh tokens |
| 2 | ✅ COMPLETE | User profile, nutrition engine |
| 3 | ✅ COMPLETE | Food database, search, food details |
| 4 | ✅ COMPLETE | Meal tracking, daily nutrition |
| 5 | 📋 PLANNED | Grocery inventory |
| 6 | 📋 PLANNED | AI meal recommendation engine |
| 7 | 📋 PLANNED | Meal planning |
| 8 | 📋 PLANNED | Smart grocery list generation |
| 9 | 📋 PLANNED | Notifications, personalization |
| 10 | 📋 PLANNED | Dashboard, product polish |
| 11 | 📋 PLANNED | Testing, security, production readiness |
| 12 | 📋 PLANNED | Deployment, final release |

---

## Stage Details

### Stage 0 — Foundation (COMPLETE)

**Status:** ✅ Verified and working

**Goal:** Establish a solid, runnable development foundation with all core infrastructure in place.

**Completed:**
- npm workspaces monorepo structure
- Expo SDK 57 mobile application with React 19, React Native 0.86, TypeScript 6
- Fastify API with health endpoints
- PostgreSQL database in Docker Compose
- TypeScript compilation and type checking
- Automated testing framework
- Git initialization and .gitignore
- Development documentation

---

### Stage 1 — Authentication & Account Foundation (COMPLETE)

**Status:** ✅ Verified on physical Android device

**Goal:** Implement secure user authentication and account management.

**Completed:**
- User registration, login, logout endpoints
- JWT access tokens and refresh token rotation
- Argon2id password hashing
- Token family-based reuse detection
- Authentication middleware
- Mobile SecureStore integration
- Session persistence across app restarts
- All auth tests passing

---

### Stage 2 — User Profile & Nutrition Engine (COMPLETE)

**Status:** ✅ Verified on physical Android device

**Goal:** Implement user profile creation and deterministic nutrition calculations.

**Completed:**
- User profiles table with constraints
- Mifflin-St Jeor BMR calculation
- TDEE calculation with activity multipliers
- Goal-based calorie adjustments (TDEE ± 300)
- Goal-specific protein targets (1.6 or 1.8 g/kg)
- 25% fat and remaining carb calculation
- Profile creation, retrieval, update endpoints
- Mobile profile form with dropdowns
- Profile display screen with calculated nutrition
- All nutrition tests passing
- Full TypeScript type safety

---

### Stage 3 — Food Database & Search (COMPLETE)

**Status:** ✅ Implementation complete & tested

**Goal:** Implement food database with search and browsing capabilities.

**Database:**
- Migration: 003_create_food_database.sql
- Tables: food_categories, foods
- Categories: 13 (Grains, Rice, Roti, Dal, Vegetables, Fruits, Dairy, Eggs, Meat, Nuts, Snacks, Beverages, Other)
- Foods: 67 curated entries with full nutrition data
- Fields per food: id, category_id, name, description, serving_size, serving_unit, calories, protein, carbs, fat, fiber
- Indexes on category_id, name, and full-text search (TSVECTOR)
- Constraints on numeric ranges (all > 0)

**Food Data Strategy:**
- Curated internal dataset suitable for MVP
- High-quality common foods with accurate nutrition values
- Indian foods included (dal, roti, paneer, etc.)
- Serving sizes are standard and clear (e.g., "medium banana 118g")
- No external API dependency (USDA integration deferred to future stages)
- Food data is authoritative in database, not calculated

**Backend API:**

Endpoints:
- GET /api/foods/categories — List all categories
- GET /api/foods — Search foods with pagination
  - Query params: q (search term), category (filter), limit (max 100), offset
  - Response includes pagination metadata (total, hasMore)
- GET /api/foods/:id — Get food detail by ID
- GET /api/foods/category/:categoryId — Get foods by category

Food Service (apps/api/src/foodService.ts):
- getCategories(): Returns all categories
- searchFoods(query, categoryId, limit, offset): Full-text and filter search
- getFoodById(id): Retrieve single food
- getFoodsByCategory(categoryId, limit, offset): Browse category

**Mobile UI:**

FoodSearchScreen (FoodScreens.tsx):
- Search input field
- Category filter buttons (horizontal scroll)
- Paginated food list with lazy loading
- Shows food name, serving size, and calories per serving
- Loading states and error handling
- Empty state messaging

FoodDetailScreen (FoodScreens.tsx):
- Back navigation
- Serving information section
- Full nutrition per serving:
  - Calories (highlighted)
  - Protein, carbs, fat, fiber
- Macro grid showing values in grams and kcal/g
- All values displayed from backend database

App Integration:
- MainFlow component manages screen state
- Navigation: ProfileDisplay → FoodSearch → FoodDetail → back to FoodSearch
- Food data flows entirely from API (no hardcoding)
- Search and category filters immediately call backend

Mobile Client (apps/mobile/src/foodClient.ts):
- getCategories(): Fetch all categories
- searchFoods(query, categoryId, limit, offset): Search with pagination
- getFoodById(id): Get food detail
- getFoodsByCategory(categoryId, limit, offset): Browse by category
- All requests include Bearer token auth

**Tests:** 17/17 passing (no new tests added for food data, as food database is catalog data with no business logic)

**Verification:**
- ✅ TypeScript compilation passes (npm run type-check)
- ✅ All 17 existing tests pass (npm run test)
- ✅ Expo dependencies up to date
- ✅ No regressions in Stage 1A (auth still works)
- ✅ No regressions in Stage 2 (profiles still work)
- ✅ Migration runs successfully
- ✅ Food data seeded and queryable
- ✅ Search works with partial text matching
- ✅ Category filtering works
- ✅ Pagination works correctly
- ✅ Food detail displays all nutrition fields
- ✅ Serving information displays correctly

**Key Architectural Decisions:**
- Food database is authoritative source of nutrition data (backend only)
- Mobile app does NOT store or calculate any food/nutrition data
- All food data requests go through API with pagination
- Categories are fetched once on search screen load
- Search uses case-insensitive LIKE matching + TSVECTOR for optimization
- Pagination prevents loading entire database into mobile app
- Authentication required for all food endpoints (catalog data policy)

**Known Limitations:**
- Food database is manually curated (67 entries)
- No USDA API integration yet (planned for future)
- No AI/Gemini food suggestions yet (planned for Stage 6)
- No meal logging yet (planned for Stage 4)
- Search does not use advanced NLP (simple text matching)

**Next Stage:** Stage 5 — Grocery Inventory

---


---

### Stage 4 — Meal Tracking & Daily Nutrition (COMPLETE)

**Status:** ✅ COMPLETE — Backend implemented, 34 tests passing, Android verification complete

**Goal:** Allow users to log foods consumed and track daily nutrition against Stage 2 targets.

**Database:**
- Migration: 004_create_meal_tracking.sql
- Tables: meal_types (Breakfast, Lunch, Dinner, Snacks), meal_entries
- Fields per entry: id, user_id, food_id, meal_type_id, quantity_value, quantity_unit, logged_date, logged_time, calories, protein_g, carbohydrates_g, fat_g, fiber_g, created_at, updated_at
- Constraints: CHECK constraints on quantity > 0 and nutrition >= 0; DB trigger check_logged_date_not_future prevents future dates
- Indexes: user_id, logged_date, composite (user_id, logged_date), meal_type_id

**Architectural Decisions & Snapshot Strategy:**
- Meal entries store nutrition snapshots at the time of logging (calories, protein_g, carbohydrates_g, fat_g, fiber_g)
- Reason: Ensures historical meal logs remain stable if food catalog entries are later corrected or updated
- All nutrition snapshots are strictly calculated server-side based on food_id and quantity
- Client cannot supply or inject custom nutrition values (route body types exclude nutrition fields)

**Backend API:**
- GET /api/meals/types — List meal types (Breakfast, Lunch, Dinner, Snacks)
- POST /api/meals — Create meal entry (backend calculates nutrition)
- GET /api/meals?date=YYYY-MM-DD — Get meal entries for specified date
- GET /api/meals/summary?date=YYYY-MM-DD — Get daily nutrition summary:
  - consumed: { calories, protein_g, carbohydrates_g, fat_g, fiber_g }
  - targets: { calories, protein_g, carbohydrates_g, fat_g } (from Stage 2 profile)
  - remaining: { calories, protein_g, carbohydrates_g, fat_g } (targets - consumed)
- GET /api/meals/:id — Get meal entry detail (checks user ownership)
- PUT /api/meals/:id — Update meal entry (recalculates nutrition snapshot)
- DELETE /api/meals/:id — Delete meal entry (checks user ownership)

**Mobile UI:**
- MealTrackingScreen: Date navigation, daily summary card displaying consumed/targets/remaining directly from API, entries grouped by meal type with edit/delete buttons
- AddMealForm: Meal type selector, food search with autocomplete, quantity input, save/cancel
- Full screen navigation in App.tsx

**Automated Tests (34 total):**
- 17 existing tests (auth & nutrition)
- 17 new meal tracking tests in apps/api/src/meal.test.ts covering:
  - Create meal entry
  - Reject zero/negative quantity
  - Reject invalid meal type / nonexistent food
  - Scaling calculations for 60g/90g Brown Bread (calories, protein, carbs, fat, fiber)
  - Date filtering and user isolation
  - Get, update, delete meal entry
  - Daily summary consumed, target, and remaining calculations
  - Missing profile handling (targets/remaining = null)
  - Security: prevent cross-user read/update/delete
  - Future date rejection (DB trigger + application layer)
  - Backend-only nutrition calculation (ignores client input)

**Verification Status:**
- ✅ npm run type-check — PASS
- ✅ npm run test — 34/34 PASS (as reported at Stage 4 completion; not re-run in this documentation update)
- ✅ npx expo install --check — UP TO DATE
- ✅ Expo Metro bundling — PASS
- ✅ Physical Android device testing — PASS (meal-tracking date-navigation regression test passed on a physical Android device)



## Implementation Guidelines for Future Codex Sessions

### Every Implementation Task Must:

1. **Identify Current Stage**
   - Read this roadmap
   - Determine which stage is being implemented
   - Confirm scope is limited to that stage

2. **Inspect Repository**
   - Check current state of code
   - Verify previous stages are complete
   - Identify what needs to be built

3. **Implement Only Requested Scope**
   - Do not skip ahead to future stages
   - Do not add features from other stages
   - Focus narrowly on stage requirements

4. **Verify**
   - Run tests
   - Run type checks
   - Test the actual functionality
   - Confirm no regressions

5. **Report**
   - List files changed
   - Describe what was implemented
   - Report test results
   - Do NOT claim next stage is ready until explicitly instructed

### Do NOT:

- Implement multiple stages in one task
- Skip stages out of order
- Begin a new stage without explicit user instruction
- Add features beyond the current stage scope
- Modify this roadmap without user direction

### Do:

- Read this roadmap at the start of every task
- Ask questions if scope is unclear
- Report blockers that prevent the stage
- Suggest architectural improvements if they align with principles
- Maintain code quality and testing standards

---

## Current Project Status

**SmartMeal Stage 0 — Foundation:** ✅ COMPLETE & VERIFIED
**SmartMeal Stage 1 — Authentication:** ✅ COMPLETE & VERIFIED
**SmartMeal Stage 2 — User Profile & Nutrition Engine:** ✅ COMPLETE & VERIFIED
**SmartMeal Stage 3 — Food Database & Search:** ✅ COMPLETE & VERIFIED
**SmartMeal Stage 4 — Meal Tracking & Daily Nutrition:** ✅ COMPLETE & VERIFIED

**Completed Features:**
- npm workspaces monorepo
- Expo SDK 57 mobile application
- Fastify API with health endpoints
- PostgreSQL via Docker Compose
- User registration, login, logout
- JWT authentication with refresh token rotation
- Secure token storage in mobile app
- User profiles with nutrition calculations
- Deterministic BMR/TDEE/macro calculations
- Profile creation, retrieval, and update endpoints
- Mobile UI for profile management
- Food database with 13 categories and 67 curated foods
- Food search with pagination
- Food detail display with full nutrition info
- Category browsing
- Meal logging with quantity scaling
- Daily nutrition summary (consumed, target, remaining)
- 34 passing tests covering auth, nutrition, and meal tracking (as reported at Stage 4 completion)
- Full TypeScript type safety
- No regressions in Stage 1A, Stage 2, or Stage 3

**Current Development Status:**
- All Stage 4 requirements implemented and verified
- TypeScript compilation passes
- All 34 tests passing
- No breaking changes to Stage 1, Stage 2, or Stage 3
- Ready for Stage 5 implementation when requested

**Next Stage:** Stage 5 — Grocery Inventory

**What to do next:** When Stage 5 is ready to be implemented, inspect the Stage 5 section above, create the grocery inventory schema, implement inventory CRUD and shopping list endpoints, and verify all components work together.

---

## Additional Resources

- Architecture documentation: `docs/README.md`
- Stage 0 setup guide: `README.md`
- Database schema: migrations in `apps/api/db/migrations/`
- API endpoints:
  - Auth: `apps/api/src/authRoutes.ts`
  - Profile: `apps/api/src/profileRoutes.ts`
  - Food: `apps/api/src/foodRoutes.ts`
- Services:
  - Food: `apps/api/src/foodService.ts`
  - Profile: `apps/api/src/profileService.ts`
  - Auth: `apps/api/src/authService.ts`
- Nutrition engine: `apps/api/src/nutrition.ts`
- Mobile screens:
  - Profile: `apps/mobile/src/ProfileScreens.tsx`
  - Food: `apps/mobile/src/FoodScreens.tsx`
- Mobile clients:
  - Profile: `apps/mobile/src/profileClient.ts`
  - Food: `apps/mobile/src/foodClient.ts`
  - Auth: `apps/mobile/src/authClient.ts`
