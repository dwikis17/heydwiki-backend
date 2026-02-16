import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { createBlog, listBlogs } from "../controllers/blog.controller";
import { createCategory, deleteCategory } from "../controllers/category.controller";
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject
} from "../controllers/project.controller";
import { requireAuth } from "../middleware/auth";
import { signAccessToken } from "../utils/jwt";

const hoisted = vi.hoisted(() => {
  const project = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  };

  const category = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };

  const blog = {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  };

  const user = {
    findUnique: vi.fn(),
    upsert: vi.fn()
  };

  const prisma = {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    project,
    category,
    blog,
    user
  };

  return { prisma, project, category, blog, user };
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

describe("API handlers and middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.JWT_EXPIRES_IN = "7d";

    hoisted.prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    hoisted.prisma.$transaction.mockImplementation(async (ops: Array<Promise<unknown>>) => {
      return Promise.all(ops);
    });
  });

  it("registers /health route", () => {
    const app = createApp();
    const healthRoute = (app as any)?._router?.stack?.find(
      (layer: any) => layer.route?.path === "/health"
    );
    expect(healthRoute).toBeTruthy();
  });

  it("auth middleware blocks missing token", async () => {
    const { nextError } = await runHandler(requireAuth, {});
    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("auth middleware blocks invalid token", async () => {
    const { nextError } = await runHandler(requireAuth, {
      headers: { authorization: "Bearer invalid-token" }
    });
    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("auth middleware accepts valid token", async () => {
    const token = signAccessToken({ userId: "user-1", email: "dwikis17@gmail.com" });

    const { req, nextError } = await runHandler(requireAuth, {
      headers: { authorization: `Bearer ${token}` }
    });

    expect(nextError).toBeUndefined();
    expect(req.auth?.userId).toBe("user-1");
  });

  it("createProject validates image URLs", async () => {
    const { nextError } = await runHandler(createProject, {
      body: {
        title: "P1",
        description: "desc",
        year: 2026,
        tags: [],
        overviewHtml: "",
        challengeHtml: "",
        solutionHtml: "",
        images: ["bad-url"]
      }
    });
    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("createProject validates year", async () => {
    const { nextError } = await runHandler(createProject, {
      body: {
        title: "P1",
        description: "desc",
        year: 1800,
        tags: [],
        overviewHtml: "",
        challengeHtml: "",
        solutionHtml: "",
        images: []
      }
    });
    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("createProject validates tags", async () => {
    const { nextError } = await runHandler(createProject, {
      body: {
        title: "P1",
        description: "desc",
        year: 2026,
        tags: ["", "very-long-tag-name-that-is-definitely-longer-than-forty-characters"],
        overviewHtml: "",
        challengeHtml: "",
        solutionHtml: "",
        images: []
      }
    });
    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("createProject validates links payload", async () => {
    const { nextError } = await runHandler(createProject, {
      body: {
        title: "P1",
        description: "desc",
        year: 2026,
        tags: ["Next.js"],
        links: [{ label: "Repo", url: "invalid-url" }],
        overviewHtml: "",
        challengeHtml: "",
        solutionHtml: "",
        images: []
      }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("createProject returns 201 on success", async () => {
    hoisted.project.create.mockResolvedValue({ id: "p1" });
    const { res } = await runHandler(createProject, {
      body: {
        title: "P1",
        description: "<script>alert('x')</script><p>desc</p>",
        year: 2026,
        tags: ["Swift", "swift"],
        client: "Client Name",
        duration: "3 months",
        links: [{ label: "GitHub", url: "https://github.com/dwikis17" }],
        overviewHtml: "<p>Overview</p>",
        challengeHtml: "<p>Challenge</p>",
        solutionHtml: "<p>Solution</p>",
        images: ["https://example.com/1.png"]
      }
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "p1" });
  });

  it("listProjects returns pagination metadata", async () => {
    hoisted.project.count.mockResolvedValue(1);
    hoisted.project.findMany.mockResolvedValue([{ id: "p1" }]);

    const { res } = await runHandler(listProjects, {
      query: { page: "1", limit: "10", search: "port" }
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as any).meta.total).toBe(1);
  });

  it("getProjectById returns NOT_FOUND when missing", async () => {
    hoisted.project.findUnique.mockResolvedValue(null);
    const { nextError } = await runHandler(getProjectById, {
      params: { id: "missing" }
    });
    expect((nextError as any).code).toBe("NOT_FOUND");
  });

  it("updateProject supports partial details update", async () => {
    hoisted.project.findUnique.mockResolvedValue({ id: "p1" });
    hoisted.project.update.mockResolvedValue({ id: "p1", tags: ["Swift"] });

    const { res, nextError } = await runHandler(updateProject, {
      params: { id: "p1" },
      body: {
        tags: ["Swift", "swift"],
        client: "Client A",
        links: [{ label: "Live", url: "https://example.com/live" }]
      }
    });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect((res.body as any).id).toBe("p1");
    expect(hoisted.project.update).toHaveBeenCalled();
  });

  it("deleteCategory returns CONFLICT when category has blogs", async () => {
    hoisted.category.findUnique.mockResolvedValue({
      id: "cat-1",
      _count: { blogs: 2 }
    });

    const { nextError } = await runHandler(deleteCategory, {
      params: { id: "cat-1" }
    });

    expect((nextError as any).code).toBe("CONFLICT");
  });

  it("createBlog returns BAD_REQUEST for invalid category", async () => {
    hoisted.category.findUnique.mockResolvedValue(null);

    const { nextError } = await runHandler(createBlog, {
      body: {
        title: "My Blog",
        description: "post",
        images: ["https://example.com/img.png"],
        categoryId: "invalid"
      }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("listBlogs supports category filter with pagination", async () => {
    hoisted.blog.count.mockResolvedValue(1);
    hoisted.blog.findMany.mockResolvedValue([{ id: "b1" }]);

    const { res } = await runHandler(listBlogs, {
      query: { page: "1", limit: "10", categoryId: "cat-1" }
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as any).meta.total).toBe(1);
  });

  it("createCategory can return conflict", async () => {
    hoisted.category.create.mockRejectedValue({
      statusCode: 409,
      code: "CONFLICT",
      message: "Resource already exists"
    });

    const { nextError } = await runHandler(createCategory, {
      body: { name: "Development" }
    });

    expect((nextError as any).code).toBe("CONFLICT");
  });
});
