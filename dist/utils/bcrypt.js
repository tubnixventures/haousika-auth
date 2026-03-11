import bcrypt from "bcrypt";
// Recommended salt rounds for security vs performance
const SALT_ROUNDS = 12;
/**
 * Hash a plain text password
 * @param password - raw password string
 * @returns hashed password string
 */
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
/**
 * Compare a plain text password with a stored hash
 * @param password - raw password string
 * @param hash - hashed password from DB
 * @returns true if match, false otherwise
 */
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
