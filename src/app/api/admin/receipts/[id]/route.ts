import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

/** DELETE /api/admin/receipts/:id — permanently removes a receipt (e.g. confirmed fraud/spam). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: { winner: true } });
  if (!receipt) return apiError("Receipt not found.", 404);
  if (receipt.winner) {
    return apiError("Cannot delete a receipt that already has a prize winner attached. Cancel the winner first.", 409);
  }

  // FraudLog.receiptId uses onDelete: NoAction (SQL Server disallows the
  // cascade path here because of a separate multi-path constraint on
  // User), so dependent fraud-log rows must be cleared explicitly before
  // the receipt itself can be deleted.
  await prisma.$transaction([
    prisma.fraudLog.deleteMany({ where: { receiptId: id } }),
    prisma.receipt.delete({ where: { id } }),
  ]);

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "RECEIPT_DELETED",
    entityType: "Receipt",
    entityId: id,
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ deleted: true });
}
