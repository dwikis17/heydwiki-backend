import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createExperience,
  deleteExperience,
  getExperienceById,
  listExperiences,
  updateExperience
} from "../controllers/experience.controller";
import { requireAuth } from "../middleware/auth";
import { signAccessToken } from "../utils/jwt";

const hoisted = vi.hoisted(() => {
  const experience = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };

  return {
    prisma: {
      experience
    },
    experience
  };
});

vi.mock("../lib/prisma", () => ({
  prisma: hoisted.prisma
}));

type HandlerInput = {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const runHandler = async (handler: RequestHandler, input: HandlerInput = {}) => {
  const req = {
    body: input.body || {},
    params: input.params || {},
    query: input.query || {},
    headers: input.headers || {}
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
    },
    send(payload?: unknown) {
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

describe("Experience handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.JWT_EXPIRES_IN = "7d";
  });

  it("requires auth for write routes", async () => {
    const { nextError } = await runHandler(requireAuth, {});
    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("creates valid experience", async () => {
    hoisted.experience.create.mockResolvedValue({ id: "exp-1" });

    const { res, nextError } = await runHandler(createExperience, {
      body: {
        company: "Acme",
        role: "Software Engineer",
        startMonth: "2023-01",
        endMonth: "2024-06",
        isCurrent: false,
        summaryHtml: "<p>Built systems</p>",
        highlights: ["Shipped billing"],
        techTags: ["Node.js", "PostgreSQL"],
        links: [{ label: "Company", url: "https://example.com" }],
        sortOrder: 1
      }
    });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(201);
  });

  it("rejects invalid month format", async () => {
    const { nextError } = await runHandler(createExperience, {
      body: {
        company: "Acme",
        role: "Engineer",
        startMonth: "2023/01",
        summaryHtml: "<p>x</p>",
        highlights: [],
        techTags: [],
        links: []
      }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("rejects invalid chronology", async () => {
    const { nextError } = await runHandler(createExperience, {
      body: {
        company: "Acme",
        role: "Engineer",
        startMonth: "2024-05",
        endMonth: "2023-01",
        summaryHtml: "<p>x</p>",
        highlights: [],
        techTags: [],
        links: []
      }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("rejects endMonth when current role", async () => {
    const { nextError } = await runHandler(createExperience, {
      body: {
        company: "Acme",
        role: "Engineer",
        startMonth: "2023-01",
        endMonth: "2024-01",
        isCurrent: true,
        summaryHtml: "<p>x</p>",
        highlights: [],
        techTags: [],
        links: []
      }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("supports partial update", async () => {
    hoisted.experience.findUnique.mockResolvedValue({
      id: "exp-1",
      startMonth: "2023-01",
      endMonth: "2023-12",
      isCurrent: false
    });
    hoisted.experience.update.mockResolvedValue({ id: "exp-1", role: "Senior Engineer" });

    const { res, nextError } = await runHandler(updateExperience, {
      params: { id: "exp-1" },
      body: { role: "Senior Engineer", isCurrent: true, endMonth: null }
    });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(200);
  });

  it("lists experiences publicly", async () => {
    hoisted.experience.findMany.mockResolvedValue([{ id: "exp-1" }]);

    const { res } = await runHandler(listExperiences, {
      query: { search: "acme" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "exp-1" }]);
  });

  it("returns not found on missing id for get/update/delete", async () => {
    hoisted.experience.findUnique.mockResolvedValueOnce(null);
    const getMissing = await runHandler(getExperienceById, { params: { id: "missing" } });
    expect((getMissing.nextError as any).code).toBe("NOT_FOUND");

    hoisted.experience.findUnique.mockResolvedValueOnce(null);
    const updateMissing = await runHandler(updateExperience, {
      params: { id: "missing" },
      body: { role: "x" }
    });
    expect((updateMissing.nextError as any).code).toBe("NOT_FOUND");

    hoisted.experience.findUnique.mockResolvedValueOnce(null);
    const deleteMissing = await runHandler(deleteExperience, { params: { id: "missing" } });
    expect((deleteMissing.nextError as any).code).toBe("NOT_FOUND");
  });

  it("requireAuth accepts valid JWT", async () => {
    const token = signAccessToken({ userId: "u1", email: "dwikis17@gmail.com" });
    const { req, nextError } = await runHandler(requireAuth, {
      headers: { authorization: `Bearer ${token}` }
    });

    expect(nextError).toBeUndefined();
    expect(req.auth?.userId).toBe("u1");
  });
});

