import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "../middleware/auth";
import { uploadImages } from "../controllers/upload.controller";
import { signAccessToken } from "../utils/jwt";

const hoisted = vi.hoisted(() => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({
    upload,
    getPublicUrl
  }));

  const getSupabaseAdminClient = vi.fn(() => ({
    storage: { from }
  }));

  const getStorageBucket = vi.fn(() => "images");

  return {
    upload,
    getPublicUrl,
    from,
    getSupabaseAdminClient,
    getStorageBucket
  };
});

vi.mock("../lib/supabase", () => ({
  getSupabaseAdminClient: hoisted.getSupabaseAdminClient,
  getStorageBucket: hoisted.getStorageBucket
}));

type HandlerInput = {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  files?: Array<{
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    stream: unknown;
    buffer: Buffer;
  }>;
};

const runHandler = async (handler: RequestHandler, input: HandlerInput = {}) => {
  const req = {
    body: input.body || {},
    headers: input.headers || {},
    files: input.files || []
  } as any;

  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  } as any;

  let nextError: unknown;

  const next = (error?: unknown) => {
    if (error) {
      nextError = error;
    }
  };

  await handler(req, res, next);
  await new Promise((resolve) => setImmediate(resolve));

  return { req, res, nextError };
};

const makeFile = (
  overrides: Partial<{
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    stream: unknown;
    buffer: Buffer;
  }> = {}
) => {
  const buffer = overrides.buffer || Buffer.from("abc");

  return {
    fieldname: "files",
    originalname: overrides.originalname || "test.jpg",
    encoding: "7bit",
    mimetype: overrides.mimetype || "image/jpeg",
    size: overrides.size || buffer.byteLength,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as any,
    buffer
  };
};

describe("Upload endpoint handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.JWT_EXPIRES_IN = "7d";

    hoisted.upload.mockResolvedValue({ error: null });
    hoisted.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: "https://example.com/storage/v1/object/public/images/projects/file.jpg"
      }
    });
  });

  it("requireAuth rejects missing token", async () => {
    const { nextError } = await runHandler(requireAuth, {});
    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("returns BAD_REQUEST when folder is invalid", async () => {
    const { nextError } = await runHandler(uploadImages, {
      body: { folder: "invalid" },
      files: [makeFile()]
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("returns BAD_REQUEST when files are missing", async () => {
    const { nextError } = await runHandler(uploadImages, {
      body: { folder: "projects" },
      files: []
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("returns BAD_REQUEST for too many files", async () => {
    const files = Array.from({ length: 11 }, () => makeFile());

    const { nextError } = await runHandler(uploadImages, {
      body: { folder: "projects" },
      files
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("returns BAD_REQUEST for file larger than 5MB", async () => {
    const bigFile = makeFile({
      size: 5 * 1024 * 1024 + 1,
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 1)
    });

    const { nextError } = await runHandler(uploadImages, {
      body: { folder: "projects" },
      files: [bigFile]
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("returns links for valid payload", async () => {
    const { res, nextError } = await runHandler(uploadImages, {
      body: { folder: "projects" },
      files: [makeFile({ originalname: "one.jpg" }), makeFile({ originalname: "two.png", mimetype: "image/png" })]
    });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect((res.body as any).links).toHaveLength(2);
  });

  it("returns INTERNAL_ERROR when storage upload fails", async () => {
    hoisted.upload.mockResolvedValue({
      error: {
        message: "storage failed"
      }
    });

    const { nextError } = await runHandler(uploadImages, {
      body: { folder: "blogs" },
      files: [makeFile({ originalname: "post.jpg" })]
    });

    expect((nextError as any).code).toBe("INTERNAL_ERROR");
  });

  it("requireAuth accepts valid JWT", async () => {
    const token = signAccessToken({
      userId: "user-1",
      email: "dwikis17@gmail.com"
    });

    const { req, nextError } = await runHandler(requireAuth, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(nextError).toBeUndefined();
    expect(req.auth?.userId).toBe("user-1");
  });
});
