import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

export function generateToken(payload: object, expiresIn = "15m"): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken<T>(token: string): T {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
}
