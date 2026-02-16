import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { comparePassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import { validateRequiredString } from "../utils/validators";

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const email = validateRequiredString(req.body.email, "email").toLowerCase();
  const password = validateRequiredString(req.body.password, "password");

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email
  });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email
    }
  });
});
