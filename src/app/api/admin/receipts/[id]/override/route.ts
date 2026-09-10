import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { manualOverrideReceiptSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit";
import { sendNotification } from "@/lib/notifications";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = manualOverrideReceiptSchema.safeParse({ ...(body as object), receiptId: id });
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) return apiError("Receipt not found.", 404);

  const newStatus = parsed.data.action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.receipt.update({
    where: { id },
    data: {
      status: newStatus,
      rejectionReason: parsed.data.action === "REJECT" ? parsed.data.reason ?? "Rejected by admin review." : null,
      hayatnaProductDetected: parsed.data.action === "APPROVE" ? true : receipt.hayatnaProductDetected,
    },
  });

  await sendNotification(receipt.userId, newStatus === "APPROVED" ? "RECEIPT_APPROVED" : "RECEIPT_REJECTED", "IN_APP", {
    reason: parsed.data.reason ?? "",
  });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: `RECEIPT_MANUAL_${parsed.data.action}`,
    entityType: "Receipt",
    entityId: id,
    metadata: { reason: parsed.data.reason },
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ receiptId: id, status: newStatus });
}
