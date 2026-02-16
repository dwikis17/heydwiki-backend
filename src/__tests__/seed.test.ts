import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeEmail,
  resolveSeedCredentials,
  upsertSeedAdminUser
} from "../utils/seed-user";

const upsert = vi.fn();

const mockPrisma = {
  user: {
    upsert
  }
} as any;

describe("Seed user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEED_ADMIN_EMAIL = "dwikis17@gmail.com";
    process.env.SEED_ADMIN_PASSWORD = "Password1!";
  });

  it("normalizes email", () => {
    expect(normalizeEmail("  DWIKIS17@GMAIL.COM ")).toBe("dwikis17@gmail.com");
  });

  it("resolves credentials from env", () => {
    const credentials = resolveSeedCredentials();

    expect(credentials.email).toBe("dwikis17@gmail.com");
    expect(credentials.password).toBe("Password1!");
  });

  it("upserts admin user and hashes password", async () => {
    upsert.mockResolvedValue({
      id: "user-1",
      email: "dwikis17@gmail.com"
    });

    await upsertSeedAdminUser(mockPrisma);

    expect(upsert).toHaveBeenCalledTimes(1);

    const payload = upsert.mock.calls[0][0];
    expect(payload.where.email).toBe("dwikis17@gmail.com");
    expect(payload.create.passwordHash).toBeTypeOf("string");
    expect(payload.create.passwordHash).not.toBe("Password1!");
    expect(payload.update.passwordHash).toBe(payload.create.passwordHash);
  });
});
