# SmartMeal Architecture & Technical Decisions

## Project Overview

SmartMeal is an AI-powered personalized meal planning application. Stage 0 focuses on establishing a solid development foundation with:
- A React Native mobile app (Expo)
- A Fastify REST API backend
- PostgreSQL database (Docker Compose)
- TypeScript across both frontend and backend
- npm workspaces monorepo structure

## Architecture

```
SmartMeal (npm workspace monorepo)
├── apps/
│   ├── mobile/     React Native + Expo + TypeScript
│   └── api/        Fastify + Node.js + TypeScript
├── packages/
│   └── shared/     (placeholder for future shared types)
└── compose.yaml    PostgreSQL service
```

### Communication Flow

```
Android Device / Emulator
       ↓
   React Native App
       ↓ (HTTP/REST)
   Fastify API (localhost:3000)
       ↓ (TCP)
   PostgreSQL (localhost:5432)
```

### Future: AI Integration

When Gemini API is integrated, all requests will route through the backend. The mobile app will never hold API credentials.

## Key Decisions

1. **Monorepo Structure**: npm workspaces keep dependencies isolated while avoiding unnecessary abstraction. The `shared` package is a placeholder—it's created only if/when truly needed.

2. **TypeScript Everywhere**: Strict mode enabled for type safety across all services.

3. **Minimal Dependencies**: Only essential packages (Fastify, pg, React Native/Expo). Avoid adding complexity at this stage.

4. **Environment Variables**: Required values are validated at startup. Missing credentials result in clear error messages.

5. **CORS Configuration**: Restricted to `http://localhost:8081` (Expo default) in development. Will be configurable per environment.

6. **No ORM Yet**: Using raw SQL via `pg` package. ORM decision deferred to when schema complexity justifies it.

7. **Health Endpoints**: Simple `/health` for liveness; `/health/ready` for readiness (includes DB connectivity check).

## Development Environment

**Expected Tools**:
- Node.js 18+
- npm 9+
- Docker & Docker Compose
- Git

**Local Setup**:
- Database: PostgreSQL 16 (Alpine) in Docker
- API: Fastify on `http://localhost:3000`
- Mobile: Expo on `http://localhost:8081` (default)

## Future Stages

**Stage 1** will likely include:
- User registration and authentication
- Password hashing and JWT tokens
- User profile CRUD
- Basic food database schema

Avoid implementing these in Stage 0. Focus on verifying that the foundation is solid.
