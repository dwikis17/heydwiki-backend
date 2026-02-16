import { Router } from "express";
import {
  createBlog,
  deleteBlog,
  getBlogById,
  listBlogs,
  updateBlog
} from "../controllers/blog.controller";
import { requireAuth } from "../middleware/auth";

export const blogRouter = Router();

blogRouter.get("/", listBlogs);
blogRouter.get("/:id", getBlogById);
blogRouter.post("/", requireAuth, createBlog);
blogRouter.patch("/:id", requireAuth, updateBlog);
blogRouter.delete("/:id", requireAuth, deleteBlog);
