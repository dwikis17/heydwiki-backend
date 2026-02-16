import type { RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { sanitizeRichHtml } from "../utils/html";
import {
  parsePagination,
  parseSearch,
  requireAtLeastOneField,
  validateImageLinks,
  validateOptionalHtmlField,
  validateOptionalImageLinks,
  validateOptionalStringWithMaxLength,
  validateOptionalExternalLinks,
  validateOptionalTags,
  validateOptionalYear,
  validateExternalLinks,
  validateRequiredHtmlField,
  validateRequiredStringWithMaxLength,
  validateRequiredTags,
  validateRequiredYear
} from "../utils/validators";

export const createProject: RequestHandler = asyncHandler(async (req, res) => {
  const title = validateRequiredStringWithMaxLength(req.body.title, "title", 160);
  const description = validateRequiredHtmlField(req.body.description, "description", 50000);
  const year = validateRequiredYear(req.body.year, "year");
  const tags = validateRequiredTags(req.body.tags, "tags");
  const client =
    req.body.client === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.client, "client", 120);
  const duration =
    req.body.duration === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.duration, "duration", 120);
  const overviewHtml = validateRequiredHtmlField(req.body.overviewHtml, "overviewHtml", 50000);
  const challengeHtml = validateRequiredHtmlField(req.body.challengeHtml, "challengeHtml", 50000);
  const solutionHtml = validateRequiredHtmlField(req.body.solutionHtml, "solutionHtml", 50000);
  const links = req.body.links === undefined ? [] : validateExternalLinks(req.body.links, "links");
  const images = validateImageLinks(req.body.images);

  const project = await prisma.project.create({
    data: {
      title,
      description: sanitizeRichHtml(description),
      year,
      tags,
      ...(client !== undefined ? { client } : {}),
      ...(duration !== undefined ? { duration } : {}),
      overviewHtml: sanitizeRichHtml(overviewHtml),
      challengeHtml: sanitizeRichHtml(challengeHtml),
      solutionHtml: sanitizeRichHtml(solutionHtml),
      links: links as Prisma.InputJsonValue,
      images
    }
  });

  res.status(201).json(project);
});

export const listProjects: RequestHandler = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
  const search = parseSearch(req.query.search);

  const where = search
    ? {
        title: {
          contains: search,
          mode: "insensitive" as const
        }
      }
    : undefined;

  const [total, data] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit
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

export const getProjectById: RequestHandler = asyncHandler(async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id }
  });

  if (!project) {
    throw new AppError(404, "NOT_FOUND", "Project not found");
  }

  res.status(200).json(project);
});

export const updateProject: RequestHandler = asyncHandler(async (req, res) => {
  requireAtLeastOneField(req.body, [
    "title",
    "description",
    "year",
    "images",
    "tags",
    "links",
    "client",
    "duration",
    "overviewHtml",
    "challengeHtml",
    "solutionHtml"
  ]);

  const title = validateOptionalStringWithMaxLength(req.body.title, "title", 160);
  const description = validateOptionalHtmlField(req.body.description, "description", 50000);
  const year = validateOptionalYear(req.body.year, "year");
  const tags = validateOptionalTags(req.body.tags, "tags");
  const links = validateOptionalExternalLinks(req.body.links, "links");
  const client =
    req.body.client === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.client, "client", 120);
  const duration =
    req.body.duration === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.duration, "duration", 120);
  const overviewHtml = validateOptionalHtmlField(req.body.overviewHtml, "overviewHtml", 50000);
  const challengeHtml = validateOptionalHtmlField(req.body.challengeHtml, "challengeHtml", 50000);
  const solutionHtml = validateOptionalHtmlField(req.body.solutionHtml, "solutionHtml", 50000);
  const images = validateOptionalImageLinks(req.body.images);

  const exists = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Project not found");
  }

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: sanitizeRichHtml(description) } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(links !== undefined ? { links: links as Prisma.InputJsonValue } : {}),
      ...(client !== undefined ? { client } : {}),
      ...(duration !== undefined ? { duration } : {}),
      ...(overviewHtml !== undefined ? { overviewHtml: sanitizeRichHtml(overviewHtml) } : {}),
      ...(challengeHtml !== undefined ? { challengeHtml: sanitizeRichHtml(challengeHtml) } : {}),
      ...(solutionHtml !== undefined ? { solutionHtml: sanitizeRichHtml(solutionHtml) } : {}),
      ...(images !== undefined ? { images } : {})
    }
  });

  res.status(200).json(updated);
});

export const deleteProject: RequestHandler = asyncHandler(async (req, res) => {
  const exists = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!exists) {
    throw new AppError(404, "NOT_FOUND", "Project not found");
  }

  await prisma.project.delete({ where: { id: req.params.id } });

  res.status(204).send();
});
