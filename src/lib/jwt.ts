import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";
import type { AdminRole } from "@/types/enums";

/**
 * JWT-only auth helpers (no bcrypt) — safe to import from edge middleware.
 * Password hashing lives in @/lib/auth, which is Node-runtime only.
 */

const accessSecret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(config.JWT_REFRESH_SECRET);

export interface AdminTokenClaims {
  sub: string; // admin id
  email: string;
  role: AdminRole;
  name: string;
}

export async function signAdminAccessToken(claims: AdminTokenClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.JWT_ACCESS_TTL_MIN}m`)
    .setSubject(claims.sub)
    .sign(accessSecret);
}

export async function signAdminRefreshToken(adminId: string): Promise<string> {
  return new SignJWT({ typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.JWT_REFRESH_TTL_DAYS}d`)
    .setSubject(adminId)
    .sign(refreshSecret);
}

export async function verifyAdminAccessToken(token: string): Promise<AdminTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (!payload.sub || !payload.email || !payload.role) return null;
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as AdminRole,
      name: (payload.name as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function verifyAdminRefreshToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export const ADMIN_ACCESS_COOKIE = config.ADMIN_SESSION_COOKIE_NAME;
export const ADMIN_REFRESH_COOKIE = `${config.ADMIN_SESSION_COOKIE_NAME}_refresh`;

export function hasRole(claims: AdminTokenClaims, allowed: AdminRole[]): boolean {
  return allowed.includes(claims.role);
}

// -----------------------------------------------------------------------------
// Participant session — issued after /api/register, scoped to a single
// campaign entry. Keeps userId/campaignId server-verified instead of trusting
// client-supplied identifiers on upload/verify/spin requests.
// -----------------------------------------------------------------------------

export const PARTICIPANT_SESSION_COOKIE = "hayatna_participant_session";

export interface ParticipantSessionClaims {
  userId: string;
  campaignId: string;
}

export async function signParticipantSession(claims: ParticipantSessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .setSubject(claims.userId)
    .sign(accessSecret);
}

export async function verifyParticipantSession(token: string): Promise<ParticipantSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (!payload.userId || !payload.campaignId) return null;
    return { userId: payload.userId as string, campaignId: payload.campaignId as string };
  } catch {
    return null;
  }
}
