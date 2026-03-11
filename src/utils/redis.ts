import { Redis } from "@upstash/redis";
import dotenv from 'dotenv';
dotenv.config();

export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

// Store session
export async function setSession(key: string, value: string, ttlSeconds = 3600) {
  await redis.set(key, value, { ex: ttlSeconds });
}

// Get session
export async function getSession(key: string): Promise<string | null> {
  return await redis.get<string>(key);
}

// Delete session
export async function deleteSession(key: string) {
  await redis.del(key);
}
