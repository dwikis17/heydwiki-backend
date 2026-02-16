import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./password";

const DEFAULT_SEED_EMAIL = "dwikis17@gmail.com";
const DEFAULT_SEED_PASSWORD = "Password1!";

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const resolveSeedCredentials = () => {
  const rawEmail = process.env.SEED_ADMIN_EMAIL || DEFAULT_SEED_EMAIL;
  const rawPassword = process.env.SEED_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD;

  const email = normalizeEmail(rawEmail);
  const password = rawPassword.trim();

  if (!email) {
    throw new Error("SEED_ADMIN_EMAIL is required");
  }

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is required");
  }

  return {
    email,
    password
  };
};

export const upsertSeedAdminUser = async (prisma: PrismaClient): Promise<void> => {
  const { email, password } = resolveSeedCredentials();
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash
    }
  });
};
