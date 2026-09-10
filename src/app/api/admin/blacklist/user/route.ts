import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { blacklistUserSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = blacklistUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { isBlacklisted: true, blacklistReason: parsed.data.reason },
  });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "USER_BLACKLISTED",
    entityType: "User",
    entityId: user.id,
    metadata: { reason: parsed.data.reason },
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ userId: user.id, isBlacklisted: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return apiError("userId is required.", 400);

  const user = await prisma.user.update({ where: { id: userId }, data: { isBlacklisted: false, blacklistReason: null } });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "USER_UNBLACKLISTED",
    entityType: "User",
    entityId: user.id,
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ userId: user.id, isBlacklisted: false });
}
