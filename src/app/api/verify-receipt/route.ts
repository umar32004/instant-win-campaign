import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { PARTICIPANT_SESSION_COOKIE, verifyParticipantSession } from "@/lib/auth";
import { verifyReceiptSchema } from "@/lib/validation/schemas";

/**
 * Read-only status check for a previously uploaded receipt — used by the
 * frontend to poll/display the verification outcome (and to re-fetch after
 * an admin manual override) without re-running OCR.
 */
export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(PARTICIPANT_SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifyParticipantSession(sessionToken) : null;
  if (!session) {
    return apiError("Please register before verifying a receipt.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const parsed = verifyReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 422, { fieldErrors: parsed.error.flatten().fieldErrors });
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: parsed.data.receiptId },
    include: { items: true, winner: true },
  });

  if (!receipt || receipt.userId !== session.userId) {
    return apiError("Receipt not found.", 404);
  }

  return apiSuccess({
    receiptId: receipt.id,
    status: receipt.status,
    eligible: receipt.hayatnaProductDetected && receipt.status === "APPROVED",
    confidence: receipt.hayatnaConfidence,
    rejectionReason: receipt.rejectionReason,
    detectedProducts: receipt.items
      .filter((i) => i.isHayatnaProduct)
      .map((i) => ({ name: i.rawText, confidence: i.matchConfidence })),
    canSpin: receipt.status === "APPROVED" && !receipt.winner,
    alreadySpun: Boolean(receipt.winner),
  });
}
