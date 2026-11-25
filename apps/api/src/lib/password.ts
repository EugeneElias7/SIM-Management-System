import argon2 from 'argon2';

// OWASP-recommended Argon2id baseline (19 MiB memory, 2 iterations, 1 lane).
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * A fixed hash used to keep login timing similar when an email does not exist.
 * This is a hash of a random throwaway string, not a usable credential.
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$u6uQqv/4//foCpH7KMth9w$2PLKux5ifY3EVRQ8QhUmV0bP1YJuziFoBnZvjHnpXe8';
