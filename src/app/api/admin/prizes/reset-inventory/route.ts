import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

const resetSchema = z.object({
  prizeId: z.string().cuid().optional(), // omit to reset every prize in the active campaign
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN"]);
  if (!admin) return apiError("Unauthorized — requires SUPER_ADMIN role.", 401);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — resets all prizes
  }

  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const prizes = await prisma.prize.findMany({
    where: parsed.data.prizeId ? { id: parsed.data.prizeId } : {},
    include: { inventory: true },
  });

  const now = new Date();
  for (const prize of prizes) {
    if (!prize.inventory) continue;
    await prisma.prizeInventory.update({
      where: { prizeId: prize.id },
      data: {
        remainingStock: prize.inventory.totalStock,
        dailyAwarded: 0,
        weeklyAwarded: 0,
        campaignAwarded: 0,
        lastDailyReset: now,
        lastWeeklyReset: now,
      },
    });
    await prisma.prize.update({ where: { id: prize.id }, data: { isActive: true } });
  }

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "PRIZE_INVENTORY_RESET",
    entityType: "Prize",
    entityId: parsed.data.prizeId ?? "ALL",
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ resetCount: prizes.length });
}
