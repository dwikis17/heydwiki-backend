import type { Prisma } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import {
  parsePagination,
  parseSearch,
  requireAtLeastOneField,
  validateImageLinks,
  validateOptionalImageLinks,
  validateOptionalString,
  validateRequiredString
} from "../utils/validators";

const ensureCategoryExists = async (categoryId: string): Promise<void> => {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw new AppError(400, "BAD_REQUEST", "Invalid categoryId");
  }
};

export const createBlog: RequestHandler = asyncHandler(async (req, res) => {
  const title = validateRequiredString(req.body.title, "title");
  const description = validateRequiredString(req.body.description, "description");
  const images = validateImageLinks(req.body.images);
  const categoryId = validateRequiredString(req.body.categoryId, "categoryId");

  await ensureCategoryExists(categoryId);

  const blog = await prisma.blog.create({
    data: {
      title,
      description,
      images,
      categoryId
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  res.status(201).json(blog);
});

export const listBlogs: RequestHandler = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = parseSearch(req.query.search);

  const categoryId =
    req.query.categoryId === undefined
      ? undefined
      : validateRequiredString(req.query.categoryId, "categoryId");

  const where: Prisma.BlogWhereInput = {
    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive"
          }
        }
      : {}),
    ...(categoryId ? { categoryId } : {})
  };

  const [total, data] = await prisma.$transaction([
    prisma.blog.count({ where }),
    prisma.blog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ]);

  res.status(200).json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
});

export const getBlogById: RequestHandler = asyncHandler(async (req, res) => {
  const blog = await prisma.blog.findUnique({
    where: { id: req.params.id },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!blog) {
    throw new AppError(404, "NOT_FOUND", "Blog not found");
  }

  res.status(200).json(blog);
});

export const updateBlog: RequestHandler = asyncHandler(async (req, res) => {
  requireAtLeastOneField(req.body, ["title", "description", "images", "categoryId"]);

  const title = validateOptionalString(req.body.title, "title");
  const description = validateOptionalString(req.body.description, "description");
  const images = validateOptionalImageLinks(req.body.images);
  const categoryId = validateOptionalString(req.body.categoryId, "categoryId");

  const exists = await prisma.blog.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Blog not found");
  }

  if (categoryId !== undefined) {
    await ensureCategoryExists(categoryId);
  }

  const updated = await prisma.blog.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(images !== undefined ? { images } : {}),
      ...(categoryId !== undefined ? { categoryId } : {})
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  res.status(200).json(updated);
});

export const deleteBlog: RequestHandler = asyncHandler(async (req, res) => {
  const exists = await prisma.blog.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Blog not found");
  }

  await prisma.blog.delete({ where: { id: req.params.id } });

  res.status(204).send();
});
