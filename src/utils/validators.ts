import { AppError } from "./app-error";

const URL_PROTOCOLS = new Set(["http:", "https:"]);
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return URL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

export type ExternalLinkInput = {
  label: string;
  url: string;
};

export const validateRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} is required`);
  }

  return value.trim();
};

export const validateOptionalString = (value: unknown, fieldName: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} cannot be empty`);
  }

  return trimmed;
};

export const validateImageLinks = (value: unknown, fieldName = "images"): string[] => {
  if (!Array.isArray(value)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an array of URLs`);
  }

  const invalid = value.find(
    (entry) => typeof entry !== "string" || !isValidHttpUrl(entry)
  );

  if (invalid !== undefined) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must only contain valid http/https URLs`);
  }

  return value;
};

export const validateOptionalImageLinks = (
  value: unknown,
  fieldName = "images"
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateImageLinks(value, fieldName);
};

const isValidYear = (value: number): boolean => {
  return Number.isInteger(value) && value >= 1900 && value <= 2100;
};

export const validateRequiredYear = (value: unknown, fieldName = "year"): number => {
  const year = Number(value);

  if (!isValidYear(year)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an integer between 1900 and 2100`);
  }

  return year;
};

export const validateOptionalYear = (value: unknown, fieldName = "year"): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateRequiredYear(value, fieldName);
};

export const validateRequiredStringWithMaxLength = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string => {
  const validated = validateRequiredString(value, fieldName);

  if (validated.length > maxLength) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be ${maxLength} characters or fewer`);
  }

  return validated;
};

export const validateOptionalStringWithMaxLength = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string | undefined => {
  const validated = validateOptionalString(value, fieldName);

  if (validated !== undefined && validated.length > maxLength) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be ${maxLength} characters or fewer`);
  }

  return validated;
};

export const validateRequiredHtmlField = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string => {
  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be a string`);
  }

  if (value.length > maxLength) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be ${maxLength} characters or fewer`);
  }

  return value;
};

export const validateOptionalHtmlField = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateRequiredHtmlField(value, fieldName, maxLength);
};

export const validateTags = (value: unknown, fieldName = "tags"): string[] => {
  if (!Array.isArray(value)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an array of strings`);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new AppError(400, "BAD_REQUEST", `${fieldName} must contain only strings`);
    }

    const normalized = entry.trim();

    if (!normalized || normalized.length > 40) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName} entries must be between 1 and 40 characters`);
    }

    const dedupeKey = normalized.toLowerCase();

    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      deduped.push(normalized);
    }
  }

  return deduped;
};

export const validateRequiredTags = (value: unknown, fieldName = "tags"): string[] => {
  return validateTags(value, fieldName);
};

export const validateOptionalTags = (
  value: unknown,
  fieldName = "tags"
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateTags(value, fieldName);
};

export const validateHighlights = (value: unknown, fieldName = "highlights"): string[] => {
  if (!Array.isArray(value)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an array of strings`);
  }

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new AppError(400, "BAD_REQUEST", `${fieldName} must contain only strings`);
    }

    const normalized = entry.trim();

    if (!normalized || normalized.length > 200) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName} entries must be between 1 and 200 characters`);
    }

    const dedupeKey = normalized.toLowerCase();
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      deduped.push(normalized);
    }
  }

  return deduped;
};

export const validateOptionalHighlights = (
  value: unknown,
  fieldName = "highlights"
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateHighlights(value, fieldName);
};

export const validateTechTags = (value: unknown, fieldName = "techTags"): string[] => {
  return validateTags(value, fieldName);
};

export const validateOptionalTechTags = (
  value: unknown,
  fieldName = "techTags"
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateTechTags(value, fieldName);
};

export const validateExternalLinks = (value: unknown, fieldName = "links"): ExternalLinkInput[] => {
  if (!Array.isArray(value)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must be an array`);
  }

  const deduped: ExternalLinkInput[] = [];
  const seenUrls = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName} items must be objects`);
    }

    const rawLabel = (item as Record<string, unknown>).label;
    const rawUrl = (item as Record<string, unknown>).url;

    if (typeof rawLabel !== "string" || !rawLabel.trim()) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName}.label is required`);
    }

    const label = rawLabel.trim();
    if (label.length > 40) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName}.label must be 40 characters or fewer`);
    }

    if (typeof rawUrl !== "string" || !isValidHttpUrl(rawUrl)) {
      throw new AppError(400, "BAD_REQUEST", `${fieldName}.url must be a valid http/https URL`);
    }

    const normalizedUrl = rawUrl.trim();
    const dedupeKey = normalizedUrl.toLowerCase();

    if (!seenUrls.has(dedupeKey)) {
      seenUrls.add(dedupeKey);
      deduped.push({ label, url: normalizedUrl });
    }
  }

  return deduped;
};

export const validateOptionalExternalLinks = (
  value: unknown,
  fieldName = "links"
): ExternalLinkInput[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateExternalLinks(value, fieldName);
};

export const validateRequiredMonthString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || !MONTH_PATTERN.test(value)) {
    throw new AppError(400, "BAD_REQUEST", `${fieldName} must use YYYY-MM format`);
  }

  return value;
};

export const validateOptionalMonthString = (
  value: unknown,
  fieldName: string
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return validateRequiredMonthString(value, fieldName);
};

export const validateExperienceChronology = (
  startMonth: string,
  endMonth: string | null | undefined,
  isCurrent: boolean
): void => {
  if (isCurrent && endMonth) {
    throw new AppError(400, "BAD_REQUEST", "endMonth must be null when isCurrent is true");
  }

  if (endMonth && endMonth < startMonth) {
    throw new AppError(400, "BAD_REQUEST", "endMonth cannot be earlier than startMonth");
  }
};

export const parsePagination = (query: Record<string, unknown>) => {
  const pageRaw = query.page;
  const limitRaw = query.limit;

  const page = pageRaw === undefined ? 1 : Number(pageRaw);
  const limit = limitRaw === undefined ? 10 : Number(limitRaw);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, "BAD_REQUEST", "page must be an integer >= 1");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "BAD_REQUEST", "limit must be an integer between 1 and 100");
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
};

export const parseSearch = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", "search must be a string");
  }

  const normalized = value.trim();
  return normalized || undefined;
};

export const requireAtLeastOneField = (
  payload: Record<string, unknown>,
  fields: string[]
): void => {
  const hasAtLeastOne = fields.some((field) => payload[field] !== undefined);

  if (!hasAtLeastOne) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `At least one of these fields is required: ${fields.join(", ")}`
    );
  }
};
