import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { getActiveCampaignOrThrow } from "@/lib/campaign";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return apiError("Unauthorized", 401);

  let campaign;
  try {
    campaign = await getActiveCampaignOrThrow();
  } catch {
    return apiError("No active campaign configured.", 503);
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalRegistrations,
    totalReceipts,
    approvedReceipts,
    rejectedReceipts,
    pendingReviews,
    todaysEntries,
    todaysWinners,
    prizes,
    receiptsByStore,
    dailyParticipation,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.receipt.count({ where: { campaignId: campaign.id } }),
    prisma.receipt.count({ where: { campaignId: campaign.id, status: "APPROVED" } }),
    prisma.receipt.count({ where: { campaignId: campaign.id, status: "REJECTED" } }),
    prisma.receipt.count({ where: { campaignId: campaign.id, status: { in: ["PENDING", "PROCESSING", "FLAGGED"] } } }),
    prisma.receipt.count({ where: { campaignId: campaign.id, submittedAt: { gte: startOfDay } } }),
    prisma.winner.count({ where: { campaignId: campaign.id, wonAt: { gte: startOfDay } } }),
    prisma.prize.findMany({
      where: { campaignId: campaign.id },
      include: { inventory: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.receipt.groupBy({
      by: ["storeNameNormalized"],
      where: { campaignId: campaign.id, storeNameNormalized: { not: null } },
      _count: { _all: true },
    }),
    // Parameterized tagged-template query — Prisma binds `campaign.id` as a
    // real SQL parameter, never string-interpolated, so this is not
    // vulnerable to SQL injection despite using raw SQL for the date grouping.
    prisma.$queryRaw<{ day: string; count: number }[]>`
      SELECT CAST(submittedAt AS DATE) as day, COUNT(*) as count
      FROM receipts
      WHERE campaignId = ${campaign.id} AND submittedAt >= DATEADD(day, -14, GETDATE())
      GROUP BY CAST(submittedAt AS DATE)
      ORDER BY day ASC
    `.catch(() => [] as { day: string; count: number }[]),
  ]);

  return apiSuccess({
    campaign: { name: campaign.name, status: campaign.status, startDate: campaign.startDate, endDate: campaign.endDate },
    stats: {
      totalRegistrations,
      totalReceipts,
      approvedReceipts,
      rejectedReceipts,
      pendingReviews,
      todaysEntries,
      todaysWinners,
    },
    prizeInventory: prizes.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.isActive,
      remainingStock: p.inventory?.remainingStock ?? 0,
      totalStock: p.inventory?.totalStock ?? 0,
      dailyAwarded: p.inventory?.dailyAwarded ?? 0,
      dailyLimit: p.inventory?.dailyLimit ?? null,
      weeklyAwarded: p.inventory?.weeklyAwarded ?? 0,
      weeklyLimit: p.inventory?.weeklyLimit ?? null,
    })),
    storeParticipation: receiptsByStore.map((s) => ({
      store: s.storeNameNormalized,
      count: s._count._all,
    })),
    dailyParticipation,
  });
}
