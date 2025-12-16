import { hash, compare, genSalt } from 'bcrypt-ts';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt-ts (Edge compatible)
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await genSalt(SALT_ROUNDS);
    return hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return compare(password, hashedPassword);
}

export { hash, compare, genSalt };