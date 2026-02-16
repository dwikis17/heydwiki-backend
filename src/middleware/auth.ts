import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header"));
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing access token"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.userId,
      email: payload.email
    };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
};
