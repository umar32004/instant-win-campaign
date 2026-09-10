import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getActiveCampaignOrThrow } from "@/lib/campaign";

/**
 * Public prize list for rendering the wheel's segments. Deliberately omits
 * probabilityWeight and inventory counts — those stay server-side so the
 * odds can never be inferred or gamed from the client.
 */
export async function GET() {
  let campaign;
  try {
    campaign = await getActiveCampaignOrThrow();
  } catch {
    return apiError("No active campaign is currently running.", 503);
  }

  const prizes = await prisma.prize.findMany({
    where: { campaignId: campaign.id, isActive: true, inventory: { is: { remainingStock: { gt: 0 } } } },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, description: true, imageUrl: true, tier: true },
  });

  return apiSuccess({ prizes });
}
