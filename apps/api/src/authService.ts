import { Pool, QueryResult } from "pg";
import { hashPassword, verifyPassword, hashToken, getRefreshTokenExpiryTime } from "./auth.js";

export class AuthService {
  constructor(private pool: Pool) {}

  async registerUser(email: string, password: string): Promise<number> {
    // Check if user already exists
    const existing = await this.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      throw new Error("Email already registered");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await this.pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email, passwordHash]
    );

    return result.rows[0].id;
  }

  async getUserByEmail(email: string): Promise<{ id: number; email: string; password_hash: string } | null> {
    const result = await this.pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserById(userId: number): Promise<{ id: number; email: string } | null> {
    const result = await this.pool.query("SELECT id, email FROM users WHERE id = $1", [userId]);
    return result.rows[0] || null;
  }

  async createRefreshToken(
    userId: number,
    tokenHash: string
  ): Promise<{ id: number; token_hash: string; family_id: string; expires_at: Date }> {
    const familyId = Math.random().toString(36).substring(2, 15);
    const expiresAt = getRefreshTokenExpiryTime();

    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, token_hash, family_id, expires_at`,
      [userId, tokenHash, familyId, expiresAt]
    );

    return result.rows[0];
  }

  async getRefreshToken(tokenHash: string): Promise<{
    id: number;
    user_id: number;
    token_hash: string;
    family_id: string;
    expires_at: Date;
    revoked_at: Date | null;
  } | null> {
    const result = await this.pool.query(
      `SELECT id, user_id, token_hash, family_id, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async revokeRefreshToken(tokenId: number): Promise<void> {
    await this.pool.query("UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1", [
      tokenId,
    ]);
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.pool.query(
      "UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE family_id = $1 AND revoked_at IS NULL",
      [familyId]
    );
  }

  async rotateRefreshToken(
    oldTokenId: number,
    newTokenHash: string,
    familyId: string
  ): Promise<{ id: number; token_hash: string; expires_at: Date }> {
    const expiresAt = getRefreshTokenExpiryTime();

    const result = await this.pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, replaced_by_id)
       SELECT user_id, $2, $3, $4, NULL FROM refresh_tokens WHERE id = $1
       RETURNING id, token_hash, expires_at`,
      [oldTokenId, newTokenHash, familyId, expiresAt]
    );

    // Mark old token as replaced
    await this.pool.query("UPDATE refresh_tokens SET replaced_by_id = $2 WHERE id = $1", [
      oldTokenId,
      result.rows[0].id,
    ]);

    return result.rows[0];
  }

  async verifyLoginCredentials(email: string, password: string): Promise<number> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      throw new Error("Invalid email or password");
    }

    return user.id;
  }
}
