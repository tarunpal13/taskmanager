import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    console.error("[jwt] JWT_SECRET missing (should have been caught at startup)");
    process.exit(1);
  }
  return "dev-only-change-in-production";
}

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string; email: string } {
  const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; email: string };
  return decoded;
}
