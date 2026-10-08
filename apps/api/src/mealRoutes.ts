import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { MealService } from "./mealService.js";
import { authMiddleware, AuthenticatedRequest } from "./middleware.js";

interface CreateMealEntryBody {
  food_id: number;
  meal_type_id: number;
  quantity_value: number;
  quantity_unit: string;
  logged_date: string;
  logged_time?: string;
}

interface UpdateMealEntryBody {
  food_id: number;
  meal_type_id: number;
  quantity_value: number;
  quantity_unit: string;
  logged_date: string;
  logged_time?: string;
}

interface MealQuerystring {
  date: string;
}

export const mealRoutes = (fastify: FastifyInstance, pool: Pool) => {
  const mealService = new MealService(pool);

  // Get meal types
  fastify.get(
    "/api/meals/types",
    { preHandler: authMiddleware },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const types = await mealService.getMealTypes();
        reply.code(200).send({
          status: "success",
          data: types,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve meal types",
        });
      }
    }
  );

  // Create meal entry
  fastify.post<{ Body: CreateMealEntryBody }>(
    "/api/meals",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: CreateMealEntryBody }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const body = request.body as unknown as CreateMealEntryBody;
      const { food_id, meal_type_id, quantity_value, quantity_unit, logged_date, logged_time } = body;

      // Validation
      if (!food_id || !meal_type_id || !quantity_value || !quantity_unit || !logged_date) {
        reply.code(400).send({
          status: "error",
          message: "Missing required fields",
        });
        return;
      }

      if (quantity_value <= 0) {
        reply.code(400).send({
          status: "error",
          message: "Quantity must be greater than 0",
        });
        return;
      }

      try {
        const entry = await mealService.createMealEntry(
          authRequest.user.userId,
          food_id,
          meal_type_id,
          quantity_value,
          quantity_unit,
          logged_date,
          logged_time
        );

        reply.code(201).send({
          status: "success",
          data: entry,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("future")) {
          reply.code(400).send({
            status: "error",
            message,
          });
        } else if (message.includes("not found")) {
          reply.code(404).send({
            status: "error",
            message,
          });
        } else {
          reply.code(500).send({
            status: "error",
            message: "Failed to create meal entry",
            details: message,
          });
        }
      }
    }
  );

  // Get meals for a date
  fastify.get<{ Querystring: MealQuerystring }>(
    "/api/meals",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Querystring: MealQuerystring }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const date = request.query.date;

      if (!date) {
        reply.code(400).send({
          status: "error",
          message: "date query parameter is required",
        });
        return;
      }

      try {
        const entries = await mealService.getMealEntriesForDate(authRequest.user.userId, date);

        reply.code(200).send({
          status: "success",
          data: entries,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve meals",
        });
      }
    }
  );

  // Get daily nutrition summary
  fastify.get<{ Querystring: MealQuerystring }>(
    "/api/meals/summary",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Querystring: MealQuerystring }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const date = request.query.date;

      if (!date) {
        reply.code(400).send({
          status: "error",
          message: "date query parameter is required",
        });
        return;
      }

      try {
        const summary = await mealService.getDailyNutritionSummary(authRequest.user.userId, date);

        reply.code(200).send({
          status: "success",
          data: summary,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve nutrition summary",
        });
      }
    }
  );

  // Get meal entry by ID
  fastify.get<{ Params: { id: string } }>(
    "/api/meals/:id",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const entryId = parseInt(request.params.id, 10);

      if (isNaN(entryId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid entry ID",
        });
        return;
      }

      try {
        const entry = await mealService.getMealEntryById(authRequest.user.userId, entryId);

        if (!entry) {
          reply.code(404).send({
            status: "error",
            message: "Meal entry not found",
          });
          return;
        }

        reply.code(200).send({
          status: "success",
          data: entry,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve meal entry",
        });
      }
    }
  );

  // Update meal entry
  fastify.put<{ Params: { id: string }; Body: UpdateMealEntryBody }>(
    "/api/meals/:id",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateMealEntryBody }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const entryId = parseInt(request.params.id, 10);

      if (isNaN(entryId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid entry ID",
        });
        return;
      }

      const body = request.body as unknown as UpdateMealEntryBody;
      const { food_id, meal_type_id, quantity_value, quantity_unit, logged_date, logged_time } = body;

      if (!food_id || !meal_type_id || !quantity_value || !quantity_unit || !logged_date) {
        reply.code(400).send({
          status: "error",
          message: "Missing required fields",
        });
        return;
      }

      if (quantity_value <= 0) {
        reply.code(400).send({
          status: "error",
          message: "Quantity must be greater than 0",
        });
        return;
      }

      try {
        const entry = await mealService.updateMealEntry(
          authRequest.user.userId,
          entryId,
          food_id,
          meal_type_id,
          quantity_value,
          quantity_unit,
          logged_date,
          logged_time
        );

        reply.code(200).send({
          status: "success",
          data: entry,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("not found")) {
          reply.code(404).send({
            status: "error",
            message,
          });
        } else if (message.includes("future")) {
          reply.code(400).send({
            status: "error",
            message,
          });
        } else {
          reply.code(500).send({
            status: "error",
            message: "Failed to update meal entry",
            details: message,
          });
        }
      }
    }
  );

  // Delete meal entry
  fastify.delete<{ Params: { id: string } }>(
    "/api/meals/:id",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;
      
      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const entryId = parseInt(request.params.id, 10);

      if (isNaN(entryId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid entry ID",
        });
        return;
      }

      try {
        await mealService.deleteMealEntry(authRequest.user.userId, entryId);

        reply.code(200).send({
          status: "success",
          message: "Meal entry deleted",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("not found")) {
          reply.code(404).send({
            status: "error",
            message,
          });
        } else {
          reply.code(500).send({
            status: "error",
            message: "Failed to delete meal entry",
            details: message,
          });
        }
      }
    }
  );
};
