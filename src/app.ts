import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth.routes";
import { blogRouter } from "./routes/blog.routes";
import { categoryRouter } from "./routes/category.routes";
import { experienceRouter } from "./routes/experience.routes";
import { projectRouter } from "./routes/project.routes";
import { uploadRouter } from "./routes/upload.routes";
import { AppError } from "./utils/app-error";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(
    express.json({
      // Base64 uploads can be large; keep a safe upper bound for 10x5MB files.
      limit: "80mb"
    })
  );

  app.get("/health", async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        ok: true,
        message: "Server is healthy",
        db: "connected"
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectRouter);
  app.use("/api/experiences", experienceRouter);
  app.use("/api/categories", categoryRouter);
  app.use("/api/blogs", blogRouter);
  app.use("/api/uploads", uploadRouter);

  app.use((_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Route not found"));
  });

  app.use(errorHandler);

  return app;
};
