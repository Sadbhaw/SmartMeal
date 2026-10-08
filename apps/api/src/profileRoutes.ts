import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { ProfileService } from "./profileService.js";
import { authMiddleware, AuthenticatedRequest } from "./middleware.js";
import { validateProfile } from "./nutrition.js";

interface CreateProfileBody {
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  weight_kg: number;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";
  goal: "weight_loss" | "maintenance" | "muscle_gain";
}

export const profileRoutes = (fastify: FastifyInstance, pool: Pool) => {
  const profileService = new ProfileService(pool);

  // Create profile (protected)
  fastify.post<{ Body: CreateProfileBody }>(
    "/api/profile",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const body = request.body as unknown as CreateProfileBody;
      const { age, gender, height_cm, weight_kg, activity_level, goal } = body;

      // Validate input
      const validation = validateProfile({
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        goal,
      });

      if (!validation.valid) {
        reply.code(400).send({
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        });
        return;
      }

      try {
        // Check if profile already exists
        const exists = await profileService.profileExists(request.user.userId);
        if (exists) {
          reply.code(409).send({
            status: "error",
            message: "Profile already exists. Use PUT to update.",
          });
          return;
        }

        const profile = await profileService.createProfile(request.user.userId, {
          age,
          gender,
          height_cm,
          weight_kg,
          activity_level,
          goal,
        });

        reply.code(201).send({
          status: "success",
          data: profile,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        reply.code(500).send({
          status: "error",
          message: "Failed to create profile",
          details: message,
        });
      }
    }
  );

  // Get current user's profile (protected)
  fastify.get(
    "/api/profile",
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
        const profile = await profileService.getProfile(request.user.userId);

        if (!profile) {
          reply.code(404).send({
            status: "error",
            message: "Profile not found",
          });
          return;
        }

        reply.code(200).send({
          status: "success",
          data: profile,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve profile",
        });
      }
    }
  );

  // Update current user's profile (protected)
  fastify.put<{ Body: Partial<CreateProfileBody> }>(
    "/api/profile",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      if (!request.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const body = request.body as unknown as Partial<CreateProfileBody>;
      const { age, gender, height_cm, weight_kg, activity_level, goal } = body;

      // Validate input (only validate provided fields)
      const validation = validateProfile({
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        goal,
      });

      if (!validation.valid) {
        reply.code(400).send({
          status: "error",
          message: "Validation failed",
          errors: validation.errors,
        });
        return;
      }

      try {
        const profile = await profileService.updateProfile(request.user.userId, {
          age,
          gender,
          height_cm,
          weight_kg,
          activity_level,
          goal,
        });

        reply.code(200).send({
          status: "success",
          data: profile,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message === "Profile not found") {
          reply.code(404).send({
            status: "error",
            message: "Profile not found",
          });
        } else {
          reply.code(500).send({
            status: "error",
            message: "Failed to update profile",
            details: message,
          });
        }
      }
    }
  );
};
