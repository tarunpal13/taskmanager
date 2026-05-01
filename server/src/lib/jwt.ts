import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production");
}

const secret = JWT_SECRET ?? "dev-only-change-in-production";

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; email: string } {
  const decoded = jwt.verify(token, secret) as { userId: string; email: string };
  return decoded;
}
