import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory
} from "../controllers/category.controller";
import { requireAuth } from "../middleware/auth";

export const categoryRouter = Router();

categoryRouter.get("/", listCategories);
categoryRouter.get("/:id", getCategoryById);
categoryRouter.post("/", requireAuth, createCategory);
categoryRouter.patch("/:id", requireAuth, updateCategory);
categoryRouter.delete("/:id", requireAuth, deleteCategory);
