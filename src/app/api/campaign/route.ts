import { apiError, apiSuccess } from "@/lib/apiResponse";
import { getActiveCampaignOrThrow } from "@/lib/campaign";

export async function GET() {
  try {
    const campaign = await getActiveCampaignOrThrow();
    return apiSuccess({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        description: campaign.description,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        minPurchaseAmountAed: Number(campaign.minPurchaseAmountAed),
        termsUrl: campaign.termsUrl,
      },
    });
  } catch {
    return apiError("No active campaign is currently running.", 503);
  }
}
