import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { blacklistReceiptSchema } from "@/lib/validation/schemas";
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

  const parsed = blacklistReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const receipt = await prisma.receipt.update({
    where: { id: parsed.data.receiptId },
    data: { isBlacklisted: true, blacklistReason: parsed.data.reason, status: "REJECTED" },
  });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "RECEIPT_BLACKLISTED",
    entityType: "Receipt",
    entityId: receipt.id,
    metadata: { reason: parsed.data.reason },
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ receiptId: receipt.id, isBlacklisted: true });
}
