import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { FoodService } from "./foodService.js";

export const foodRoutes = (fastify: FastifyInstance, pool: Pool) => {
  const foodService = new FoodService(pool);

  // Get all categories
  fastify.get("/api/foods/categories", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const categories = await foodService.getCategories();
      reply.code(200).send({
        status: "success",
        data: categories,
      });
    } catch (err) {
      reply.code(500).send({
        status: "error",
        message: "Failed to retrieve food categories",
      });
    }
  });

  // Search foods with pagination
  fastify.get<{
    Querystring: {
      q?: string;
      category?: string;
      limit?: string;
      offset?: string;
    };
  }>(
    "/api/foods",
    async (request: FastifyRequest<{ Querystring: { q?: string; category?: string; limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const query = request.query.q?.trim() || undefined;
        const categoryId = request.query.category ? parseInt(request.query.category, 10) : undefined;
        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100); // Max 100 per request
        const offset = Math.max(parseInt(request.query.offset || "0", 10), 0);

        const { foods, total } = await foodService.searchFoods(query, categoryId, limit, offset);

        reply.code(200).send({
          status: "success",
          data: foods,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
          },
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to search foods",
        });
      }
    }
  );

  // Get food by ID
  fastify.get<{
    Params: {
      id: string;
    };
  }>(
    "/api/foods/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const foodId = parseInt(request.params.id, 10);

        if (isNaN(foodId)) {
          reply.code(400).send({
            status: "error",
            message: "Invalid food ID",
          });
          return;
        }

        const food = await foodService.getFoodById(foodId);

        if (!food) {
          reply.code(404).send({
            status: "error",
            message: "Food not found",
          });
          return;
        }

        reply.code(200).send({
          status: "success",
          data: food,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve food",
        });
      }
    }
  );

  // Get foods by category
  fastify.get<{
    Params: {
      categoryId: string;
    };
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>(
    "/api/foods/category/:categoryId",
    async (request: FastifyRequest<{ Params: { categoryId: string }; Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      try {
        const categoryId = parseInt(request.params.categoryId, 10);

        if (isNaN(categoryId)) {
          reply.code(400).send({
            status: "error",
            message: "Invalid category ID",
          });
          return;
        }

        // Verify category exists
        const category = await foodService.getCategoryById(categoryId);
        if (!category) {
          reply.code(404).send({
            status: "error",
            message: "Category not found",
          });
          return;
        }

        const limit = Math.min(parseInt(request.query.limit || "50", 10), 100);
        const offset = Math.max(parseInt(request.query.offset || "0", 10), 0);

        const { foods, total } = await foodService.getFoodsByCategory(categoryId, limit, offset);

        reply.code(200).send({
          status: "success",
          data: foods,
          category: category,
          pagination: {
            limit,
            offset,
            total,
            hasMore: offset + limit < total,
          },
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve foods by category",
        });
      }
    }
  );
};
