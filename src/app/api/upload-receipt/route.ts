import { NextRequest } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { PARTICIPANT_SESSION_COOKIE, verifyParticipantSession } from "@/lib/auth";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rateLimit";
import { ACCEPTED_RECEIPT_MIME_TYPES, MAX_RECEIPT_FILE_SIZE_BYTES } from "@/lib/validation/schemas";
import { processReceiptSubmission } from "@/lib/receiptProcessing";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(PARTICIPANT_SESSION_COOKIE)?.value;
  const session = sessionToken ? await verifyParticipantSession(sessionToken) : null;
  if (!session) {
    return apiError("Please register before uploading a receipt.", 401);
  }

  const ip = clientIpFromHeaders(req.headers);
  const rateLimit = await checkRateLimit(`upload:${session.userId}`, { windowMinutes: 15, maxRequests: 15 });
  if (!rateLimit.allowed) {
    return apiError("Too many upload attempts. Please wait before trying again.", 429);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isBlacklisted) {
    return apiError("This account is not eligible to participate in this campaign.", 403);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid upload — expected multipart form data.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("No receipt file was provided.", 400);
  }

  if (file.size === 0) {
    return apiError("The uploaded file is empty.", 400);
  }
  if (file.size > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return apiError("File exceeds the 10 MB maximum size.", 413);
  }
  if (!ACCEPTED_RECEIPT_MIME_TYPES.includes(file.type)) {
    return apiError("Unsupported file type. Please upload a JPG, PNG, or PDF.", 415);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Verify the file's real magic bytes match its declared MIME type — a
  // browser-supplied Content-Type header can be spoofed, so this check
  // prevents disguised executables/scripts from being stored as "receipts".
  const detectedType = await fileTypeFromBuffer(buffer);
  const isPdf = file.type === "application/pdf";
  if (isPdf) {
    const looksLikePdf = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    if (!looksLikePdf) {
      return apiError("File content does not match a valid PDF.", 415);
    }
  } else if (!detectedType || !["jpg", "jpeg", "png"].includes(detectedType.ext)) {
    return apiError("File content does not match a valid image format.", 415);
  }

  try {
    const result = await processReceiptSubmission({
      buffer,
      filename: file.name,
      contentType: file.type,
      userId: session.userId,
      campaignId: session.campaignId,
      ipAddress: ip,
      deviceFingerprint: (formData.get("deviceFingerprint") as string | null)?.slice(0, 200) ?? null,
    });

    return apiSuccess({
      receiptId: result.receiptId,
      status: result.status,
      eligible: result.eligible,
      confidence: result.confidence,
      detectedProducts: result.detectedProducts,
      rejectionReason: result.rejectionReason,
    });
  } catch (err) {
    logger.error("Receipt upload failed", { err: String(err) });
    return apiError("We couldn't process your receipt. Please try again.", 500);
  }
}
