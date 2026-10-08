# SmartMeal — AI-Powered Meal Planning

A personalized nutrition and meal planning application powered by AI. Users set goals (weight loss, muscle gain, maintenance), track their nutrition, and receive intelligent meal recommendations.

## Overview

**SmartMeal** helps users:
- Create a personal profile with age, height, weight, and activity level
- Set nutrition goals and receive calorie/macronutrient targets
- Search foods, log meals, and track daily nutrition
- Enter available groceries and get AI-assisted meal recommendations
- Add recommended meals to daily or future meal plans

This is **Stage 0**: foundation setup only. User registration, authentication, full nutrition calculations, and Gemini integration are deferred to later stages.

## Architecture

```
Android Device / Emulator
    ↓ (React Native + Expo)
Mobile App (http://localhost:8081)
    ↓ (REST API over HTTP)
Fastify Backend (http://localhost:3000)
    ↓ (PostgreSQL driver)
PostgreSQL Database (localhost:5432)
```

Future: AI requests (Gemini API) route exclusively through the backend.

## Prerequisites

Verify you have:

```powershell
node --version    # v18.0.0 or later
npm --version     # v9.0.0 or later
docker --version  # v20.0.0 or later
docker-compose --version  # v2.0.0 or later
git --version     # any recent version
```

If any tool is missing, install it before proceeding.

## Initial Setup

### 1. Clone and Install

```powershell
cd C:\Users\sadbh\Desktop\SmartMeal
npm install
```

This installs dependencies for the root workspace and all apps/packages.

### 2. Environment Configuration

Copy `.env.example` to `.env` (already done, but review if needed):

```powershell
# C:\Users\sadbh\Desktop\SmartMeal\.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartmeal
DB_USER=smartmeal
DB_PASSWORD=smartmeal_dev

API_HOST=0.0.0.0
API_PORT=3000
CORS_ORIGIN=http://localhost:8081

NODE_ENV=development
```

**Do not commit `.env` to Git.** It is ignored by `.gitignore`.

### 3. Start PostgreSQL

```powershell
# From the repo root
npm run docker:up
```

Watch the container start:

```powershell
npm run docker:logs
```

Wait for the `healthcheck=healthy` message. This typically takes 5-10 seconds.

### 4. Verify Database Readiness

```powershell
# Optional: inspect running containers
docker ps

# Optional: connect to PostgreSQL directly (if psql is installed)
psql -h localhost -U smartmeal -d smartmeal -c "SELECT NOW();"
```

## Running the Application

### Start the API

```powershell
npm run api
```

Expected output:
```
✓ API running at http://0.0.0.0:3000
```

### Test the Health Endpoints

In another terminal:

```powershell
# From anywhere (or use curl/Postman if available)
curl http://localhost:3000/health
# Response: {"status":"ok","timestamp":"2026-10-06T02:30:00.000Z"}

curl http://localhost:3000/health/ready
# Response: {"status":"ok","database":"connected","timestamp":"2026-10-06T02:30:00.000Z"}
```

### Start the Mobile App

In another terminal:

```powershell
npm run mobile
```

Expected output:
```
› Using Expo Go to develop this app.
› Ready at: exp://...
```

Press `w` to open in web browser, `a` to open Android emulator, or scan the QR code with Expo Go on a physical device.

## Connecting a Physical Android Device or Emulator to the Local API

By default, `localhost` inside an Android device or emulator **does not** refer to your development PC—it refers to the device itself.

### Option 1: Use Expo Tunnel (Recommended for Physical Devices)

Expo's tunnel automatically proxies requests through Expo's servers:

```powershell
npm run mobile
# Press 't' to enable tunnel mode
```

The API can then be accessed via your tunnel URL. Update `CORS_ORIGIN` in `.env` if needed.

### Option 2: Specify Your PC's IP (Android Emulator or Local Network)

1. Find your PC's local IP:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   Example: `192.168.1.100`

2. Update the mobile app to call the API at your PC's IP instead of `localhost`. In `src/App.tsx` (future feature), use:
   ```
   const API_URL = "http://192.168.1.100:3000";
   ```

3. Ensure your firewall allows inbound connections on port 3000.

### Option 3: Configure API_HOST

If you know your PC's IP at startup, modify `.env`:

```
API_HOST=192.168.1.100
API_PORT=3000
```

Then restart the API.

## Running Tests

### API Tests

```powershell
npm run test
```

This runs tests in `apps/api/src/**/*.test.ts`.

### TypeScript Type Checking

```powershell
npm run type-check
```

Checks both API and mobile app for TypeScript errors.

## Common Issues & Troubleshooting

### "Cannot find module" when starting API

**Problem**: Dependencies not installed.

**Solution**:
```powershell
npm install
npm run type-check  # Verify TypeScript compiles
```

### API fails to connect to PostgreSQL

**Problem**: Docker container not running or not healthy.

**Solution**:
```powershell
npm run docker:up
npm run docker:logs  # Wait for "healthcheck=healthy"
```

### "EADDRINUSE: address already in use :::3000"

**Problem**: Port 3000 already in use.

**Solution**: Change `API_PORT` in `.env` or stop the conflicting process.

### Mobile app cannot reach the API

**Problem**: Misconfigured API URL or firewall blocking.

**Solution**:
1. Verify the API is running: `curl http://localhost:3000/health`
2. Check your PC's IP: `ipconfig | Select-String "IPv4"`
3. Ensure firewall allows port 3000
4. If using an emulator, try the PC's local IP instead of `localhost`
5. If using Expo tunnel, ensure tunnel is enabled

### "health/ready" returns 503 database unavailable

**Problem**: Database container is starting or has crashed.

**Solution**:
```powershell
npm run docker:logs
# Look for errors. If needed, restart:
npm run docker:down
npm run docker:up
```

## Stopping Services

```powershell
# Stop Docker services
npm run docker:down

# Stop API and mobile app: use Ctrl+C in their respective terminals
```

## Development Workflow

1. **Make changes** to API or mobile code
2. **TypeScript will auto-compile** during development (or run `npm run type-check`)
3. **Tests** can be run independently: `npm run test`
4. **Restart the relevant service** to pick up changes

## Project Structure

```
SmartMeal/
├── apps/
│   ├── api/                 Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts    Main server
│   │   │   └── health.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── dist/           (build output, ignored)
│   │
│   └── mobile/              React Native app
│       ├── src/
│       │   └── App.tsx     Welcome screen
│       ├── app.json        Expo config
│       ├── package.json
│       ├── tsconfig.json
│       └── assets/
│
├── packages/
│   └── shared/             (placeholder for future shared types)
│
├── docs/
│   └── README.md           Technical decisions
│
├── package.json            Workspace root
├── compose.yaml            PostgreSQL Docker service
├── .env                    Local environment (not committed)
├── .env.example            Template for .env
├── .gitignore              Git ignore rules
└── README.md               This file
```

## What's NOT in Stage 0

These belong to later stages:

- ❌ User registration or login
- ❌ JWT authentication or refresh tokens
- ❌ User profile CRUD
- ❌ Calorie and macronutrient calculations
- ❌ Food database schema
- ❌ Meal logging features
- ❌ Gemini AI integration
- ❌ Grocery recommendations
- ❌ Payment features
- ❌ Production deployment

## Next Steps

After verifying this foundation works:

1. Review the outputs and test results below
2. Confirm all health endpoints are reachable
3. Check that TypeScript compiles without errors
4. Plan Stage 1 features (likely: user auth and profile setup)

## Support & Questions

Refer to `docs/README.md` for architecture details and design rationale. For build or configuration issues, check the troubleshooting section above or review the specific service logs.
