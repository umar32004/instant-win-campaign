import bcrypt from "bcryptjs";

/**
 * Node-runtime auth helpers (bcrypt password hashing). Re-exports the
 * edge-safe JWT helpers from @/lib/jwt so existing call sites can keep
 * importing everything from "@/lib/auth". Edge middleware imports
 * @/lib/jwt directly to avoid pulling bcryptjs into the edge bundle.
 */
export * from "@/lib/jwt";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
