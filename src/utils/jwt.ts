import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

type AccessTokenPayload = {
  userId: string;
  email: string;
};

type JwtConfig = {
  secret: string;
  expiresIn: SignOptions["expiresIn"];
};

const getJwtConfig = (): JwtConfig => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return {
    secret,
    expiresIn
  };
};

export const assertJwtConfiguration = (): void => {
  getJwtConfig();
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const { secret, expiresIn } = getJwtConfig();

  const options: SignOptions = {
    expiresIn,
    subject: payload.userId,
    algorithm: "HS256"
  };

  return jwt.sign({ email: payload.email }, secret, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const { secret } = getJwtConfig();
  const decoded = jwt.verify(token, secret) as JwtPayload;

  const userId = decoded.sub;
  const email = decoded.email;

  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId, email };
};
