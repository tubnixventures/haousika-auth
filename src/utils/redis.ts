import { createClient, type RedisClientType } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const USE_MEMORY = process.env.USE_MEMORY === 'true'; // For testing without Redis

let redis: RedisClientType | null = null;
const memoryStore = new Map<string, { value: string; expires: number }>();

export { USE_MEMORY, memoryStore };

export async function initRedis() {
  if (USE_MEMORY) {
    console.log('Using in-memory store for sessions');
    return;
  }

  redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redis.on('error', (err) => console.error('Redis Client Error', err));

  try {
    await redis.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    throw err;
  }
}

export { redis };

// Store session
export async function setSession(key: string, value: string, ttlSeconds = 3600) {
  if (USE_MEMORY) {
    const expires = Date.now() + ttlSeconds * 1000;
    memoryStore.set(key, { value, expires });
    return;
  }
  await redis!.set(key, value, { EX: ttlSeconds });
}

// Get session
export async function getSession(key: string): Promise<string | null> {
  if (USE_MEMORY) {
    const entry = memoryStore.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
    if (entry) {
      memoryStore.delete(key); // Clean up expired
    }
    return null;
  }
  const value = await redis!.get(key);
  return typeof value === 'string' ? value : null;
}

// Delete session
export async function deleteSession(key: string) {
  if (USE_MEMORY) {
    memoryStore.delete(key);
    return;
  }
  await redis!.del(key);
}
