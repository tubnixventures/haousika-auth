import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
export function generateToken(payload, expiresIn = "15m") {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (err) {
        throw new Error("Invalid or expired token");
    }
}
