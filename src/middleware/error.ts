import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { AppError, isPrismaKnownError } from "../utils/app-error";

const normalizePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  if (error.code === "P2002") {
    return new AppError(409, "CONFLICT", "Resource already exists", error.meta);
  }

  if (error.code === "P2003") {
    return new AppError(400, "BAD_REQUEST", "Invalid relation reference", error.meta);
  }

  if (error.code === "P2025") {
    return new AppError(404, "NOT_FOUND", "Resource not found", error.meta);
  }

  return new AppError(500, "INTERNAL_ERROR", "Database request failed", error.meta);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const maybeBodyParserError = error as { type?: string };

  if (maybeBodyParserError.type === "entity.too.large") {
    res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "Upload payload too large. Max 10 images, 5MB each."
      }
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (isPrismaKnownError(error)) {
    const normalized = normalizePrismaError(error);
    res.status(normalized.statusCode).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details
      }
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      details: process.env.NODE_ENV === "production" ? undefined : message
    }
  });
};
