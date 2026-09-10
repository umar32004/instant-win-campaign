import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { adminLoginSchema } from "@/lib/validation/schemas";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rateLimit";
import { verifyPassword, signAdminAccessToken, signAdminRefreshToken, ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { config } from "@/lib/config";
import type { AdminRole } from "@/types/enums";

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);

  // Tight rate limit — admin login is a high-value credential-stuffing target.
  const rateLimit = await checkRateLimit(`admin-login:${ip}`, { windowMinutes: 15, maxRequests: 8 });
  if (!rateLimit.allowed) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const admin = await prisma.admin.findUnique({ where: { email: parsed.data.email } });

  // Constant-shape response whether the account exists or not, to avoid
  // leaking which admin emails are registered.
  const passwordValid = admin ? await verifyPassword(parsed.data.password, admin.passwordHash) : false;

  if (!admin || !admin.isActive || !passwordValid) {
    await writeAuditLog({
      actorType: "SYSTEM",
      action: "ADMIN_LOGIN_FAILED",
      entityType: "Admin",
      metadata: { email: parsed.data.email },
      ipAddress: ip,
    });
    return apiError("Invalid email or password.", 401);
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const claims = { sub: admin.id, email: admin.email, role: admin.role as AdminRole, name: admin.name };
  const accessToken = await signAdminAccessToken(claims);
  const refreshToken = await signAdminRefreshToken(admin.id);

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.id,
    action: "ADMIN_LOGIN_SUCCESS",
    entityType: "Admin",
    entityId: admin.id,
    ipAddress: ip,
  });

  const response = apiSuccess({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ADMIN_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    maxAge: config.JWT_ACCESS_TTL_MIN * 60,
    path: "/",
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    maxAge: config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
    path: "/api/admin",
  });

  return response;
}
