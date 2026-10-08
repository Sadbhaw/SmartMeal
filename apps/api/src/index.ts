import Fastify from "fastify";
import cors from "@fastify/cors";
import { Pool } from "pg";
import { runMigrations } from "../db/migrate.js";
import { AuthService } from "./authService.js";
import { authRoutes } from "./authRoutes.js";
import { profileRoutes } from "./profileRoutes.js";
import { foodRoutes } from "./foodRoutes.js";
import { mealRoutes } from "./mealRoutes.js";

const getEnv = (key: string, defaultVal?: string): string => {
  const val = process.env[key];
  if (!val && defaultVal === undefined) {
    throw new Error(`Required environment variable missing: ${key}`);
  }
  return val || defaultVal || "";
};

const HOST = getEnv("API_HOST", "0.0.0.0");
const PORT = parseInt(getEnv("API_PORT", "3000"), 10);
const DB_HOST = getEnv("DB_HOST", "localhost");
const DB_PORT = parseInt(getEnv("DB_PORT", "5432"), 10);
const DB_NAME = getEnv("DB_NAME", "smartmeal");
const DB_USER = getEnv("DB_USER", "smartmeal");
const DB_PASSWORD = getEnv("DB_PASSWORD", "smartmeal_dev");
const CORS_ORIGIN = getEnv("CORS_ORIGIN", "http://localhost:8081");

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

fastify.get<{ Reply: { status: string; timestamp: string } }>("/health", async (request, reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

fastify.get<{ Reply: { status: string; database: string; timestamp: string } }>("/health/ready", async (request, reply) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();

    return {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    reply.code(503);
    return {
      status: "unavailable",
      database: message,
      timestamp: new Date().toISOString(),
    };
  }
});

const start = async () => {
  try {
    // Run database migrations
    console.log("Running database migrations...");
    await runMigrations(pool);
    console.log("✓ Migrations completed");

    // Initialize auth service
    const authService = new AuthService(pool);

    // Register auth routes
    authRoutes(fastify, authService);

    // Register profile routes
    profileRoutes(fastify, pool);

    // Register food routes
    foodRoutes(fastify, pool);

    // Register meal routes
    mealRoutes(fastify, pool);

    await fastify.listen({ host: HOST, port: PORT });
    console.log(`✓ API running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
