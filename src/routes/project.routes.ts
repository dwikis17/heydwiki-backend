import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  updateProject
} from "../controllers/project.controller";
import { requireAuth } from "../middleware/auth";

export const projectRouter = Router();

projectRouter.get("/", listProjects);
projectRouter.get("/:id", getProjectById);
projectRouter.post("/", requireAuth, createProject);
projectRouter.patch("/:id", requireAuth, updateProject);
projectRouter.delete("/:id", requireAuth, deleteProject);
