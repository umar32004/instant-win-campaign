import { prisma } from "@/lib/prisma";

/**
 * Resolves the campaign currently pointed to by the `campaign.active_slug`
 * system setting. Centralizing this means every route agrees on "the
 * current campaign" even though the schema supports running several
 * campaigns historically.
 */
export async function getActiveCampaignOrThrow() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "campaign.active_slug" } });
  if (!setting) throw new Error("No active campaign configured");

  const campaign = await prisma.campaign.findUnique({ where: { slug: setting.value } });
  if (!campaign) throw new Error("Configured active campaign not found");

  return campaign;
}
