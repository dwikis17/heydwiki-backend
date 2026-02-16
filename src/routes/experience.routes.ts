import { Router } from "express";
import {
  createExperience,
  deleteExperience,
  getExperienceById,
  listExperiences,
  updateExperience
} from "../controllers/experience.controller";
import { requireAuth } from "../middleware/auth";

export const experienceRouter = Router();

experienceRouter.get("/", listExperiences);
experienceRouter.get("/:id", getExperienceById);
experienceRouter.post("/", requireAuth, createExperience);
experienceRouter.patch("/:id", requireAuth, updateExperience);
experienceRouter.delete("/:id", requireAuth, deleteExperience);

