import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Pool } from "pg";
import { ShoppingListService } from "./shoppingListService.js";
import { authMiddleware, AuthenticatedRequest } from "./middleware.js";

interface CreateShoppingListItemBody {
  name: string;
  quantity_value?: number | null;
  quantity_unit?: string | null;
  is_checked?: boolean;
}

interface UpdateShoppingListItemBody {
  name: string;
  quantity_value?: number | null;
  quantity_unit?: string | null;
  is_checked?: boolean;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const validateShoppingListBody = (
  body: CreateShoppingListItemBody | UpdateShoppingListItemBody
): string | null => {
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return "name is required";
  }

  if (body.name.trim().length > 255) {
    return "name must be 255 characters or fewer";
  }

  if (body.quantity_value !== undefined && body.quantity_value !== null) {
    if (!isFiniteNumber(body.quantity_value) || body.quantity_value < 0) {
      return "quantity_value must be a finite number greater than or equal to 0";
    }
  }

  if (body.quantity_unit !== undefined && body.quantity_unit !== null) {
    if (typeof body.quantity_unit !== "string") {
      return "quantity_unit must be a string";
    }
    if (body.quantity_unit.length > 50) {
      return "quantity_unit must be 50 characters or fewer";
    }
  }

  if (body.is_checked !== undefined && typeof body.is_checked !== "boolean") {
    return "is_checked must be a boolean";
  }

  return null;
};

const parseItemId = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const shoppingListRoutes = (fastify: FastifyInstance, pool: Pool) => {
  const shoppingListService = new ShoppingListService(pool);

  // List all shopping list items for the authenticated user
  fastify.get(
    "/api/shopping-list",
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
        const items = await shoppingListService.getItems(request.user.userId);
        reply.code(200).send({
          status: "success",
          data: items,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to retrieve shopping list items",
        });
      }
    }
  );

  // Create a shopping list item
  fastify.post<{ Body: CreateShoppingListItemBody }>(
    "/api/shopping-list",
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Body: CreateShoppingListItemBody }>,
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

      const body = request.body as unknown as CreateShoppingListItemBody;
      const validationError = validateShoppingListBody(body);

      if (validationError) {
        reply.code(400).send({
          status: "error",
          message: validationError,
        });
        return;
      }

      try {
        const item = await shoppingListService.createItem(
          authRequest.user.userId,
          body.name.trim(),
          body.quantity_value ?? null,
          body.quantity_unit ?? null,
          body.is_checked ?? false
        );

        reply.code(201).send({
          status: "success",
          data: item,
        });
      } catch (err) {
        reply.code(500).send({
          status: "error",
          message: "Failed to create shopping list item",
        });
      }
    }
  );

  // Update a shopping list item
  fastify.put<{ Params: { id: string }; Body: UpdateShoppingListItemBody }>(
    "/api/shopping-list/:id",
    { preHandler: authMiddleware },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateShoppingListItemBody }>,
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

      const itemId = parseItemId(request.params.id);

      if (itemId === null) {
        reply.code(400).send({
          status: "error",
          message: "Invalid item ID",
        });
        return;
      }

      const body = request.body as unknown as UpdateShoppingListItemBody;
      const validationError = validateShoppingListBody(body);

      if (validationError) {
        reply.code(400).send({
          status: "error",
          message: validationError,
        });
        return;
      }

      try {
        const item = await shoppingListService.updateItem(
          authRequest.user.userId,
          itemId,
          body.name.trim(),
          body.quantity_value ?? null,
          body.quantity_unit ?? null,
          body.is_checked ?? false
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
            message: "Failed to update shopping list item",
            details: message,
          });
        }
      }
    }
  );

  // Delete a shopping list item
  fastify.delete<{ Params: { id: string } }>(
    "/api/shopping-list/:id",
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

      const itemId = parseItemId(request.params.id);

      if (itemId === null) {
        reply.code(400).send({
          status: "error",
          message: "Invalid item ID",
        });
        return;
      }

      try {
        await shoppingListService.deleteItem(authRequest.user.userId, itemId);

        reply.code(200).send({
          status: "success",
          message: "Shopping list item deleted",
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
            message: "Failed to delete shopping list item",
            details: message,
          });
        }
      }
    }
  );
};