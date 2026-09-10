import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { PARTICIPANT_SESSION_COOKIE, verifyParticipantSession } from "@/lib/auth";
import { spinRequestSchema } from "@/lib/validation/schemas";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rateLimit";
import { executeSpin } from "@/lib/spin/spinEngine";
import { sendNotification } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";

/**
 * The only endpoint that can produce a prize outcome. The wheel UI on the
 * frontend is purely a rendering of whatever this endpoint returns — it has
 * no ability to influence which segment "wins".
 */
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(PARTICIPANT_SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifyParticipantSession(sessionToken) : null;
  if (!session) {
    return apiError("Please register before spinning.", 401);
  }

  const ip = clientIpFromHeaders(req.headers);
  const rateLimit = await checkRateLimit(`spin:${session.userId}`, { windowMinutes: 5, maxRequests: 10 });
  if (!rateLimit.allowed) {
    return apiError("Too many spin attempts. Please wait before trying again.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = spinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const receipt = await prisma.receipt.findUnique({ where: { id: parsed.data.receiptId } });
  if (!receipt || receipt.userId !== session.userId) {
    return apiError("Receipt not found.", 404);
  }
  if (receipt.status !== "APPROVED") {
    return apiError("This receipt is not eligible for a spin.", 403);
  }

  const outcome = await executeSpin(session.campaignId, receipt.id, session.userId);

  if (outcome.status === "ALREADY_CLAIMED") {
    return apiError("A prize has already been claimed for this receipt.", 409);
  }
  if (outcome.status === "NO_PRIZE_AVAILABLE") {
    await writeAuditLog({
      actorType: "SYSTEM",
      action: "SPIN_NO_INVENTORY",
      entityType: "Receipt",
      entityId: receipt.id,
      ipAddress: ip,
    });
    return apiSuccess({ won: false, message: "All prizes have been claimed for now. Thank you for participating!" });
  }

  await sendNotification(session.userId, "WINNER_ANNOUNCED", "IN_APP", { prizeName: outcome.prizeName });
  await writeAuditLog({
    actorType: "USER",
    actorId: session.userId,
    action: "SPIN_WON",
    entityType: "Winner",
    entityId: outcome.winnerId,
    metadata: { prizeId: outcome.prizeId, prizeName: outcome.prizeName },
    ipAddress: ip,
  });

  return apiSuccess({
    won: true,
    winnerId: outcome.winnerId,
    winnerCode: outcome.winnerCode,
    prizeId: outcome.prizeId,
    prizeName: outcome.prizeName,
    redemptionCode: outcome.redemptionCode,
  });
}
