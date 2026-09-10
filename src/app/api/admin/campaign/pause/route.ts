import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { getActiveCampaignOrThrow } from "@/lib/campaign";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  const campaign = await getActiveCampaignOrThrow().catch(() => null);
  if (!campaign) return apiError("No active campaign configured.", 503);

  const updated = await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "PAUSED" } });

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "CAMPAIGN_PAUSED",
    entityType: "Campaign",
    entityId: campaign.id,
    ipAddress: clientIpFromHeaders(req.headers),
  });

  return apiSuccess({ status: updated.status });
}
