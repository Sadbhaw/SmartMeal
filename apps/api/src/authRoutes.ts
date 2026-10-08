import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./authService.js";
import { createAccessToken, createRefreshToken, hashToken } from "./auth.js";
import { authMiddleware, AuthenticatedRequest } from "./middleware.js";

interface RegisterBody {
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refresh_token: string;
}

export const authRoutes = (fastify: FastifyInstance, authService: AuthService) => {
  // Registration endpoint
  fastify.post<{ Body: RegisterBody }>(
    "/api/auth/register",
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      // Validation
      if (!email || !password) {
        reply.code(400).send({
          status: "error",
          message: "Email and password are required",
        });
        return;
      }

      if (password.length < 8) {
        reply.code(400).send({
          status: "error",
          message: "Password must be at least 8 characters",
        });
        return;
      }

      if (!email.includes("@")) {
        reply.code(400).send({
          status: "error",
          message: "Invalid email format",
        });
        return;
      }

      try {
        const userId = await authService.registerUser(email, password);
        const refreshToken = createRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);

        await authService.createRefreshToken(userId, refreshTokenHash);

        const accessToken = createAccessToken(userId);

        reply.code(201).send({
          status: "success",
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
        });
      } catch (err) {
        if (err instanceof Error && err.message === "Email already registered") {
          reply.code(409).send({
            status: "error",
            message: "Email already registered",
          });
        } else {
          reply.code(500).send({
            status: "error",
            message: "Registration failed",
          });
        }
      }
    }
  );

  // Login endpoint
  fastify.post<{ Body: LoginBody }>(
    "/api/auth/login",
    async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
      const { email, password } = request.body;

      if (!email || !password) {
        reply.code(400).send({
          status: "error",
          message: "Email and password are required",
        });
        return;
      }

      try {
        const userId = await authService.verifyLoginCredentials(email, password);
        const refreshToken = createRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);

        await authService.createRefreshToken(userId, refreshTokenHash);
        const accessToken = createAccessToken(userId);

        reply.code(200).send({
          status: "success",
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
        });
      } catch (err) {
        reply.code(401).send({
          status: "error",
          message: "Invalid email or password",
        });
      }
    }
  );

  // Refresh token endpoint
  fastify.post<{ Body: RefreshBody }>(
    "/api/auth/refresh",
    async (request: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
      const { refresh_token } = request.body;

      if (!refresh_token) {
        reply.code(400).send({
          status: "error",
          message: "Refresh token is required",
        });
        return;
      }

      try {
        const refreshTokenHash = hashToken(refresh_token);
        const tokenRecord = await authService.getRefreshToken(refreshTokenHash);

        if (!tokenRecord) {
          reply.code(401).send({
            status: "error",
            message: "Invalid refresh token",
          });
          return;
        }

        if (tokenRecord.revoked_at) {
          // Token was revoked, likely due to reuse detection
          await authService.revokeTokenFamily(tokenRecord.family_id);
          reply.code(401).send({
            status: "error",
            message: "Refresh token has been revoked",
          });
          return;
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
          reply.code(401).send({
            status: "error",
            message: "Refresh token has expired",
          });
          return;
        }

        // Rotate refresh token
        const newRefreshToken = createRefreshToken();
        const newRefreshTokenHash = hashToken(newRefreshToken);

        await authService.rotateRefreshToken(tokenRecord.id, newRefreshTokenHash, tokenRecord.family_id);
        await authService.revokeRefreshToken(tokenRecord.id);

        const accessToken = createAccessToken(tokenRecord.user_id);

        reply.code(200).send({
          status: "success",
          access_token: accessToken,
          refresh_token: newRefreshToken,
          token_type: "Bearer",
        });
      } catch (err) {
        reply.code(401).send({
          status: "error",
          message: "Token refresh failed",
        });
      }
    }
  );

  // Get current user info (protected)
  fastify.get(
    "/api/auth/me",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      try {
        const user = await authService.getUserById(request.user.userId);
        if (!user) {
          reply.code(404).send({
            status: "error",
            message: "User not found",
          });
          return;
        }

        reply.code(200).send({
          status: "success",
          data: {
            id: user.id,
            email: user.email,
          },
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve user",
        });
      }
    }
  );

  // Logout endpoint (protected)
  fastify.post(
    "/api/auth/logout",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      try {
        const body = request.body as RefreshBody | undefined;
        const refreshToken = body?.refresh_token;
        
        if (refreshToken) {
          const refreshTokenHash = hashToken(refreshToken);
          const tokenRecord = await authService.getRefreshToken(refreshTokenHash);
          if (tokenRecord) {
            await authService.revokeTokenFamily(tokenRecord.family_id);
          }
        }

        reply.code(200).send({
          status: "success",
          message: "Logged out successfully",
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Logout failed",
        });
      }
    }
  );
};
