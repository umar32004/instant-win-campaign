import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { adminSettingsUpdateSchema } from "@/lib/validation/schemas";
import { getActiveCampaignOrThrow } from "@/lib/campaign";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return apiError("Unauthorized", 401);

  const campaign = await getActiveCampaignOrThrow().catch(() => null);
  if (!campaign) return apiError("No active campaign configured.", 503);

  return apiSuccess({
    settings: {
      minPurchaseAmountAed: Number(campaign.minPurchaseAmountAed),
      receiptConfidenceThreshold: campaign.receiptConfidenceThreshold,
      maxSubmissionsPerUserPerDay: campaign.maxSubmissionsPerUserPerDay,
      fuzzyMatchThreshold: campaign.fuzzyMatchThreshold,
      status: campaign.status,
    },
  });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = adminSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const campaign = await getActiveCampaignOrThrow().catch(() => null);
  if (!campaign) return apiError("No active campaign configured.", 503);

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: parsed.data,
  });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "CAMPAIGN_SETTINGS_UPDATED",
    entityType: "Campaign",
    entityId: campaign.id,
    metadata: parsed.data,
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({
    settings: {
      minPurchaseAmountAed: Number(updated.minPurchaseAmountAed),
      receiptConfidenceThreshold: updated.receiptConfidenceThreshold,
      maxSubmissionsPerUserPerDay: updated.maxSubmissionsPerUserPerDay,
      fuzzyMatchThreshold: updated.fuzzyMatchThreshold,
      status: updated.status,
    },
  });
}
