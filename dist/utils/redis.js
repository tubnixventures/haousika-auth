import { Redis } from "@upstash/redis";
import dotenv from 'dotenv';
dotenv.config();
export const redis = new Redis({
    url: process.env.REDIS_URL,
    token: process.env.REDIS_TOKEN,
});
// Store session
export async function setSession(key, value, ttlSeconds = 3600) {
    await redis.set(key, value, { ex: ttlSeconds });
}
// Get session
export async function getSession(key) {
    return await redis.get(key);
}
// Delete session
export async function deleteSession(key) {
    await redis.del(key);
}
