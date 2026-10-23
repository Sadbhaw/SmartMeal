import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { GroceryService } from "./groceryService.js";
import { authMiddleware, AuthenticatedRequest } from "./middleware.js";

interface CreateGroceryItemBody {
  name: string;
  quantity_value: number;
  quantity_unit: string;
  food_id?: number | null;
  expiry_date?: string | null;
  notes?: string | null;
}

interface UpdateGroceryItemBody {
  name: string;
  quantity_value: number;
  quantity_unit: string;
  food_id?: number | null;
  expiry_date?: string | null;
  notes?: string | null;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const validateGroceryBody = (
  body: CreateGroceryItemBody | UpdateGroceryItemBody
): string | null => {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return "name is required";
  }

  if (!isFiniteNumber(body.quantity_value) || body.quantity_value < 0) {
    return "quantity_value must be a finite number greater than or equal to 0";
  }

  if (!body.quantity_unit || typeof body.quantity_unit !== "string") {
    return "quantity_unit is required";
  }

  if (body.food_id !== undefined && body.food_id !== null && !Number.isInteger(body.food_id)) {
    return "food_id must be an integer";
  }

  if (body.expiry_date !== undefined && body.expiry_date !== null) {
    if (typeof body.expiry_date !== "string" || !isValidCalendarDate(body.expiry_date)) {
      return "expiry_date must be a valid calendar date in YYYY-MM-DD format";
    }
  }

  return null;
};

export const groceryRoutes = (fastify: FastifyInstance, pool: Pool) => {
  const groceryService = new GroceryService(pool);

  // List all grocery items for the authenticated user
  fastify.get(
    "/api/grocery/inventory",
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
        const items = await groceryService.getItems(request.user.userId);
        reply.code(200).send({
          status: "success",
          data: items,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve grocery items",
        });
      }
    }
  );

  // Get a single grocery item
  fastify.get<{ Params: { id: string } }>(
    "/api/grocery/inventory/:id",
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

      const itemId = parseInt(request.params.id, 10);

      if (isNaN(itemId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid item ID",
        });
        return;
      }

      try {
        const item = await groceryService.getItemById(authRequest.user.userId, itemId);

        if (!item) {
          reply.code(404).send({
            status: "error",
            message: "Grocery item not found",
          });
          return;
        }

        reply.code(200).send({
          status: "success",
          data: item,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve grocery item",
        });
      }
    }
  );
  // Create a grocery item
  fastify.post<{ Body: CreateGroceryItemBody }>(
    "/api/grocery/inventory",
    { preHandler: authMiddleware },
    async (request: FastifyRequest<{ Body: CreateGroceryItemBody }>, reply: FastifyReply) => {
      const authRequest = request as AuthenticatedRequest;

      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const body = request.body as unknown as CreateGroceryItemBody;
      const validationError = validateGroceryBody(body);

      if (validationError) {
        reply.code(400).send({
          status: "error",
          message: validationError,
        });
        return;
      }

      try {
        const item = await groceryService.createItem(
          authRequest.user.userId,
          body.name,
          body.quantity_value,
          body.quantity_unit,
          body.food_id ?? null,
          body.expiry_date ?? null,
          body.notes ?? null
        );

        reply.code(201).send({
          status: "success",
          data: item,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to create grocery item",
        });
      }
    }
  );

  // Update a grocery item
  fastify.put<{ Params: { id: string }; Body: UpdateGroceryItemBody }>(
    "/api/grocery/inventory/:id",
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateGroceryItemBody }>,
      reply: FastifyReply
    ) => {
      const authRequest = request as AuthenticatedRequest;

      if (!authRequest.user) {
        reply.code(401).send({
          status: "unauthorized",
          message: "Unauthorized",
        });
        return;
      }

      const itemId = parseInt(request.params.id, 10);

      if (isNaN(itemId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid item ID",
        });
        return;
      }

      const body = request.body as unknown as UpdateGroceryItemBody;
      const validationError = validateGroceryBody(body);

      if (validationError) {
        reply.code(400).send({
          status: "error",
          message: validationError,
        });
        return;
      }

      try {
        const item = await groceryService.updateItem(
          authRequest.user.userId,
          itemId,
          body.name,
          body.quantity_value,
          body.quantity_unit,
          body.food_id ?? null,
          body.expiry_date ?? null,
          body.notes ?? null
        );

        reply.code(200).send({
          status: "success",
          data: item,
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
            message: "Failed to update grocery item",
            details: message,
          });
        }
      }
    }
  );

  // Delete a grocery item
  fastify.delete<{ Params: { id: string } }>(
    "/api/grocery/inventory/:id",
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

      const itemId = parseInt(request.params.id, 10);

      if (isNaN(itemId)) {
        reply.code(400).send({
          status: "error",
          message: "Invalid item ID",
        });
        return;
      }

      try {
        await groceryService.deleteItem(authRequest.user.userId, itemId);

        reply.code(200).send({
          status: "success",
          message: "Grocery item deleted",
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
            message: "Failed to delete grocery item",
            details: message,
          });
        }
      }
    }
  );
};

