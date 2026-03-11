import { createClient } from "@libsql/client"; // BunnyDB uses libsql-compatible client
import dotenv from "dotenv";
dotenv.config();

// Initialize BunnyDB client
export const db = createClient({
  url: process.env.BUNNY_DB_URL!,
  authToken: process.env.BUNNY_DB_TOKEN!,
});

// Simple query executor
export async function execute(query: string, params?: any[]) {
  try {
    return await db.execute(query, params);
  } catch (err) {
    console.error("DB Error:", err);
    throw err;
  }
}
