import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { getStorageBucket, getSupabaseAdminClient } from "../lib/supabase";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { validateRequiredString } from "../utils/validators";

type UploadFolder = "projects" | "blogs";

const MAX_FILES_PER_REQUEST = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set<UploadFolder>(["projects", "blogs"]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

const sanitizeFileName = (name: string): string => {
  const trimmed = name.trim().toLowerCase();
  const safe = trimmed.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
  return safe || "file";
};

const parseUploadFolder = (value: unknown): UploadFolder => {
  const folder = validateRequiredString(value, "folder") as UploadFolder;

  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new AppError(400, "BAD_REQUEST", "folder must be either projects or blogs");
  }

  return folder;
};

export const uploadImages: RequestHandler = asyncHandler(async (req, res) => {
  const folder = parseUploadFolder(req.body.folder);
  const files = ((req.files as unknown as Array<{
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }>) || []);

  if (files.length < 1 || files.length > MAX_FILES_PER_REQUEST) {
    throw new AppError(400, "BAD_REQUEST", "Upload between 1 and 10 images");
  }

  const supabase = getSupabaseAdminClient();
  const bucket = getStorageBucket();
  const links: string[] = [];

  for (const file of files) {
    if (!file.buffer?.length) {
      throw new AppError(400, "BAD_REQUEST", "Uploaded file is empty");
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError(400, "BAD_REQUEST", "Each image must be 5MB or smaller");
    }

    const safeName = sanitizeFileName(file.originalname);
    const extension = safeName.includes(".")
      ? safeName.split(".").pop() || MIME_EXTENSIONS[file.mimetype] || "bin"
      : MIME_EXTENSIONS[file.mimetype] || "bin";

    const objectPath = `${folder}/${randomUUID()}-${safeName.replace(/\.[^.]+$/, "")}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upload image", error.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    if (!data.publicUrl) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to resolve uploaded image URL");
    }

    links.push(data.publicUrl);
  }

  res.status(200).json({ links });
});
