import jwt, { Secret } from "jsonwebtoken";
import { hash, verify } from "argon2";
import crypto from "crypto";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "15m";
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || "30d";

// Parse duration string to milliseconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case "s":
      return num * 1000;
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    case "d":
      return num * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
};

// JWT utilities
export const createAccessToken = (userId: number): string => {
  return jwt.sign(
    {
      sub: userId.toString(),
      type: "access",
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE as any }
  );
};

export const verifyAccessToken = (token: string): { sub: string; type: string } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; type: string };
  } catch (err) {
    throw new Error("Invalid or expired access token");
  }
};

// Refresh token utilities
export const createRefreshToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, {
    type: 2, // Argon2id
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 4,
  });
};

export const verifyPassword = async (password: string, hashStr: string): Promise<boolean> => {
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
};

// Duration utilities
export const getRefreshTokenExpiryTime = (): Date => {
  const expiryMs = parseDuration(REFRESH_TOKEN_EXPIRE);
  return new Date(Date.now() + expiryMs);
};
