import { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "./auth.js";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: number;
  };
}

export const authMiddleware = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.code(401).send({
      status: "unauthorized",
      message: "Missing or invalid authorization header",
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyAccessToken(token);
    if (decoded.type !== "access") {
      reply.code(401).send({
        status: "unauthorized",
        message: "Invalid token type",
      });
      return;
    }

    request.user = {
      userId: parseInt(decoded.sub, 10),
    };
  } catch (err) {
    reply.code(401).send({
      status: "unauthorized",
      message: "Invalid or expired access token",
    });
  }
};
