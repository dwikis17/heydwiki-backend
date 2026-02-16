import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "../controllers/auth.controller";
import { comparePassword, hashPassword } from "../utils/password";

const hoisted = vi.hoisted(() => {
  const prisma = {
    user: {
      findUnique: vi.fn()
    }
  };

  return { prisma };
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
  let settled = false;
  let resolveSettled: () => void = () => {};
  const settledPromise = new Promise<void>((resolve) => {
    resolveSettled = resolve;
  });

  const markSettled = () => {
    if (settled) {
      return;
    }

    settled = true;
    resolveSettled();
  };

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
      markSettled();
      return this;
    },
    send(payload?: unknown) {
      this.body = payload;
      markSettled();
      return this;
    }
  } as any;

  let nextError: unknown;

  const next = (error?: unknown) => {
    if (error) {
      nextError = error;
    }
    markSettled();
  };

  await handler(req, res, next);
  await settledPromise;

  return { req, res, nextError };
};

describe("Auth login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.JWT_EXPIRES_IN = "7d";
  });

  it("returns BAD_REQUEST for missing credentials", async () => {
    const { nextError } = await runHandler(login, {
      body: { email: "dwikis17@gmail.com" }
    });

    expect((nextError as any).code).toBe("BAD_REQUEST");
  });

  it("returns UNAUTHORIZED for unknown user", async () => {
    hoisted.prisma.user.findUnique.mockResolvedValue(null);

    const { nextError } = await runHandler(login, {
      body: { email: "dwikis17@gmail.com", password: "Password1!" }
    });

    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("returns UNAUTHORIZED for wrong password", async () => {
    const hashed = await hashPassword("Password1!");

    hoisted.prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "dwikis17@gmail.com",
      passwordHash: hashed
    });

    const { nextError } = await runHandler(login, {
      body: { email: "dwikis17@gmail.com", password: "WrongPassword1!" }
    });

    expect((nextError as any).code).toBe("UNAUTHORIZED");
  });

  it("returns token and user for valid credentials", async () => {
    const hashed = await hashPassword("Password1!");

    hoisted.prisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "dwikis17@gmail.com",
      passwordHash: hashed
    });

    const { res, nextError } = await runHandler(login, {
      body: { email: "dwikis17@gmail.com", password: "Password1!" }
    });

    expect(nextError).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect((res.body as any).token).toBeTypeOf("string");
    expect((res.body as any).user.email).toBe("dwikis17@gmail.com");

    const valid = await comparePassword("Password1!", hashed);
    expect(valid).toBe(true);
  });
});
