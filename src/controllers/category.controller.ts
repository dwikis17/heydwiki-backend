import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  requireAtLeastOneField,
  validateOptionalString,
  validateRequiredString
} from "../utils/validators";

export const createCategory: RequestHandler = asyncHandler(async (req, res) => {
  const name = validateRequiredString(req.body.name, "name");
  const description = validateOptionalString(req.body.description, "description");

  const category = await prisma.category.create({
    data: {
      name,
      ...(description !== undefined ? { description } : {})
    }
  });

  res.status(201).json(category);
});

export const listCategories: RequestHandler = asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  res.status(200).json(categories);
});

export const getCategoryById: RequestHandler = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: { blogs: true }
      }
    }
  });

  if (!category) {
    throw new AppError(404, "NOT_FOUND", "Category not found");
  }

  res.status(200).json(category);
});

export const updateCategory: RequestHandler = asyncHandler(async (req, res) => {
  requireAtLeastOneField(req.body, ["name", "description"]);

  const name = validateOptionalString(req.body.name, "name");
  const description =
    req.body.description === null
      ? null
      : validateOptionalString(req.body.description, "description");

  const exists = await prisma.category.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Category not found");
  }

  const updated = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined || req.body.description === null
        ? { description }
        : {})
    }
  });

  res.status(200).json(updated);
});

export const deleteCategory: RequestHandler = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: { blogs: true }
      }
    }
  });

  if (!category) {
    throw new AppError(404, "NOT_FOUND", "Category not found");
  }

  if (category._count.blogs > 0) {
    throw new AppError(409, "CONFLICT", "Cannot delete category with existing blogs");
  }

  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
