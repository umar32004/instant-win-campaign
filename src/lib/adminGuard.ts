import type { NextRequest } from "next/server";
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken, type AdminTokenClaims } from "@/lib/auth";
import type { AdminRole } from "@/types/enums";

/**
 * Verifies the admin access-token cookie on an API route. Route handlers run
 * in the Node.js runtime (not edge middleware), so this re-verifies the JWT
 * independently rather than trusting middleware alone — defense in depth.
 */
export async function requireAdmin(
  req: NextRequest,
  allowedRoles?: AdminRole[],
): Promise<AdminTokenClaims | null> {
  const token = req.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAdminAccessToken(token);
  if (!claims) return null;

  if (allowedRoles && !allowedRoles.includes(claims.role)) return null;

  return claims;
}
