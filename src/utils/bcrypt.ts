import bcrypt from "bcrypt";

// Recommended salt rounds for security vs performance
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param password - raw password string
 * @returns hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a stored hash
 * @param password - raw password string
 * @param hash - hashed password from DB
 * @returns true if match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Usage example
const password = "Movin@juma4";

async function run() {
  const result = await hashPassword(password);
  console.log("Hashed password:", result);
}

run();
