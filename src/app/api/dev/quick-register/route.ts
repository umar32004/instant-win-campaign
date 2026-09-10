import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { signParticipantSession, PARTICIPANT_SESSION_COOKIE } from "@/lib/auth";
import { getActiveCampaignOrThrow } from "@/lib/campaign";
import { config } from "@/lib/config";

/**
 * DEV-ONLY convenience endpoint: auto-creates a sequential test user
 * (test1@test.local, test2@test.local, ...) and issues a participant
 * session, so receipt-verification testing doesn't require re-filling the
 * registration form for every test. Disabled entirely in production.
 *
 * TEMPORARY — remove this route (and its call site in /upload) once manual
 * registration testing resumes.
 */
export async function POST() {
  if (config.NODE_ENV === "production") {
    return apiError("Not available in production.", 404);
  }

  let campaign;
  try {
    campaign = await getActiveCampaignOrThrow();
  } catch {
    return apiError("No active campaign is currently running.", 503);
  }

  const existingTestUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@test.local" } },
    select: { email: true },
  });

  let maxN = 0;
  for (const u of existingTestUsers) {
    const match = u.email.match(/^test(\d+)@test\.local$/);
    if (match) maxN = Math.max(maxN, parseInt(match[1]!, 10));
  }
  const n = maxN + 1;

  const user = await prisma.user.create({
    data: {
      fullName: `Test User ${n}`,
      mobileNumber: `+9715${String(n).padStart(8, "0")}`,
      email: `test${n}@test.local`,
      emirate: "Dubai",
      ageConfirmed: true,
      termsAcceptedAt: new Date(),
    },
  });

  const token = await signParticipantSession({ userId: user.id, campaignId: campaign.id });
  const response = apiSuccess({ userId: user.id, label: `test${n}` });
  response.cookies.set(PARTICIPANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 6 * 60 * 60,
    path: "/",
  });

  return response;
}
