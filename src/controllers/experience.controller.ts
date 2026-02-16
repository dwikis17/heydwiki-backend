import { Prisma } from "@prisma/client";
import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { sanitizeRichHtml } from "../utils/html";
import {
  parseSearch,
  requireAtLeastOneField,
  validateExperienceChronology,
  validateExternalLinks,
  validateHighlights,
  validateOptionalExternalLinks,
  validateOptionalHighlights,
  validateOptionalHtmlField,
  validateOptionalMonthString,
  validateOptionalStringWithMaxLength,
  validateOptionalTechTags,
  validateRequiredHtmlField,
  validateRequiredMonthString,
  validateRequiredStringWithMaxLength,
  validateTechTags
} from "../utils/validators";

const validateSortOrder = (value: unknown, fieldName = "sortOrder"): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an integer between 0 and 10000`);
  }

  return parsed;
};

const validateOptionalSortOrder = (
  value: unknown,
  fieldName = "sortOrder"
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateSortOrder(value, fieldName);
};

export const createExperience: RequestHandler = asyncHandler(async (req, res) => {
  const company = validateRequiredStringWithMaxLength(req.body.company, "company", 120);
  const role = validateRequiredStringWithMaxLength(req.body.role, "role", 120);
  const employmentType =
    req.body.employmentType === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.employmentType, "employmentType", 80);
  const location =
    req.body.location === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.location, "location", 120);
  const startMonth = validateRequiredMonthString(req.body.startMonth, "startMonth");
  const endMonth =
    req.body.endMonth === null
      ? null
      : validateOptionalMonthString(req.body.endMonth, "endMonth");
  const isCurrent = req.body.isCurrent === undefined ? false : Boolean(req.body.isCurrent);
  const summaryHtml = validateRequiredHtmlField(req.body.summaryHtml, "summaryHtml", 50000);
  const highlights = validateHighlights(req.body.highlights ?? [], "highlights");
  const techTags = validateTechTags(req.body.techTags ?? [], "techTags");
  const links = validateExternalLinks(req.body.links ?? [], "links");
  const sortOrder = req.body.sortOrder === undefined ? 0 : validateSortOrder(req.body.sortOrder);

  validateExperienceChronology(startMonth, endMonth, isCurrent);

  const created = await prisma.experience.create({
    data: {
      company,
      role,
      employmentType,
      location,
      startMonth,
      endMonth: isCurrent ? null : endMonth ?? null,
      isCurrent,
      summaryHtml: sanitizeRichHtml(summaryHtml),
      highlights,
      techTags,
      links: links as Prisma.InputJsonValue,
      sortOrder
    }
  });

  res.status(201).json(created);
});

export const listExperiences: RequestHandler = asyncHandler(async (req, res) => {
  const search = parseSearch(req.query.search);
  const where = search
    ? {
        OR: [
          { company: { contains: search, mode: "insensitive" as const } },
          { role: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : undefined;

  const data = await prisma.experience.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { startMonth: "desc" }, { createdAt: "desc" }]
  });

  res.status(200).json(data);
});

export const getExperienceById: RequestHandler = asyncHandler(async (req, res) => {
  const experience = await prisma.experience.findUnique({ where: { id: req.params.id } });

  if (!experience) {
    throw new AppError(404, "NOT_FOUND", "Experience not found");
  }

  res.status(200).json(experience);
});

export const updateExperience: RequestHandler = asyncHandler(async (req, res) => {
  requireAtLeastOneField(req.body, [
    "company",
    "role",
    "employmentType",
    "location",
    "startMonth",
    "endMonth",
    "isCurrent",
    "summaryHtml",
    "highlights",
    "techTags",
    "links",
    "sortOrder"
  ]);

  const existing = await prisma.experience.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Experience not found");
  }

  const company = validateOptionalStringWithMaxLength(req.body.company, "company", 120);
  const role = validateOptionalStringWithMaxLength(req.body.role, "role", 120);
  const employmentType =
    req.body.employmentType === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.employmentType, "employmentType", 80);
  const location =
    req.body.location === null
      ? null
      : validateOptionalStringWithMaxLength(req.body.location, "location", 120);
  const startMonth = validateOptionalMonthString(req.body.startMonth, "startMonth");
  const endMonth =
    req.body.endMonth === null
      ? null
      : validateOptionalMonthString(req.body.endMonth, "endMonth");
  const isCurrent =
    req.body.isCurrent === undefined ? undefined : Boolean(req.body.isCurrent);
  const summaryHtml = validateOptionalHtmlField(req.body.summaryHtml, "summaryHtml", 50000);
  const highlights = validateOptionalHighlights(req.body.highlights, "highlights");
  const techTags = validateOptionalTechTags(req.body.techTags, "techTags");
  const links = validateOptionalExternalLinks(req.body.links, "links");
  const sortOrder = validateOptionalSortOrder(req.body.sortOrder);

  const nextStartMonth = startMonth ?? existing.startMonth;
  const nextIsCurrent = isCurrent ?? existing.isCurrent;
  const nextEndMonth = nextIsCurrent ? null : endMonth ?? existing.endMonth;

  validateExperienceChronology(nextStartMonth, nextEndMonth, nextIsCurrent);

  const updated = await prisma.experience.update({
    where: { id: req.params.id },
    data: {
      ...(company !== undefined ? { company } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(employmentType !== undefined ? { employmentType } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(startMonth !== undefined ? { startMonth } : {}),
      ...(req.body.endMonth !== undefined ? { endMonth: nextEndMonth } : {}),
      ...(isCurrent !== undefined ? { isCurrent } : {}),
      ...(summaryHtml !== undefined ? { summaryHtml: sanitizeRichHtml(summaryHtml) } : {}),
      ...(highlights !== undefined ? { highlights } : {}),
      ...(techTags !== undefined ? { techTags } : {}),
      ...(links !== undefined ? { links: links as Prisma.InputJsonValue } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {})
    }
  });

  res.status(200).json(updated);
});

export const deleteExperience: RequestHandler = asyncHandler(async (req, res) => {
  const existing = await prisma.experience.findUnique({
    where: { id: req.params.id },
    select: { id: true }
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Experience not found");
  }

  await prisma.experience.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

