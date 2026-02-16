import { Router } from "express";
import multer, { MulterError, type FileFilterCallback } from "multer";
import { uploadImages } from "../controllers/upload.controller";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../utils/app-error";

const MAX_FILES = 10;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files: MAX_FILES
  },
  fileFilter: (_req, file, callback: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new AppError(400, "BAD_REQUEST", "Only JPG, PNG, WEBP, and GIF are allowed"));
      return;
    }

    callback(null, true);
  }
});

const uploadMiddleware: import("express").RequestHandler = (req, res, next) => {
  upload.array("files", MAX_FILES)(req, res, (error) => {
    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError(400, "BAD_REQUEST", "Each image must be 5MB or smaller"));
        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        next(new AppError(400, "BAD_REQUEST", "You can upload up to 10 images at once"));
        return;
      }

      next(new AppError(400, "BAD_REQUEST", error.message));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

export const uploadRouter = Router();

uploadRouter.post("/", requireAuth, uploadMiddleware, uploadImages);
