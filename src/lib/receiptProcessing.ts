import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadReceiptBlob } from "@/lib/azure/blobStorage";
import { analyzeReceipt } from "@/lib/azure/documentIntelligence";
import { evaluateHayatnaEligibility } from "@/lib/eligibility/eligibilityEngine";
import { runFraudChecks, type TriggeredFraudRule } from "@/lib/fraud/fraudDetection";
import { sendNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import type { ReceiptStatus } from "@/types/enums";

export interface ProcessReceiptParams {
  buffer: Buffer;
  filename: string;
  contentType: string;
  userId: string;
  campaignId: string;
  ipAddress: string | null;
  deviceFingerprint: string | null;
}

export interface ProcessReceiptResult {
  receiptId: string;
  status: ReceiptStatus;
  eligible: boolean;
  confidence: number;
  detectedProducts: { name: string; productType?: string; confidence: number }[];
  rejectionReason: string | null;
  triggeredRules: TriggeredFraudRule[];
}

/**
 * The full upload → OCR → eligibility → fraud-check pipeline. Runs
 * synchronously within a single request (mock OCR and Azure Document
 * Intelligence's prebuilt-receipt model both typically resolve within a few
 * seconds, comfortably inside the "3–7 second" verification budget called
 * for by the product spec).
 */
export async function processReceiptSubmission(params: ProcessReceiptParams): Promise<ProcessReceiptResult> {
  const { buffer, filename, contentType, userId, campaignId, ipAddress, deviceFingerprint } = params;

  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const imageSha256 = createHash("sha256").update(buffer).digest("hex");

  const duplicateImage = await prisma.receipt.findFirst({
    where: { imageSha256, campaignId },
    select: { id: true },
  });

  const { url: imageUrl } = await uploadReceiptBlob(buffer, filename, contentType, userId);

  const ocr = await analyzeReceipt(buffer, filename, contentType);
  const eligibility = evaluateHayatnaEligibility(ocr, campaign.fuzzyMatchThreshold);

  const duplicateReceiptNumber = ocr.receiptNumber
    ? await prisma.receipt.findFirst({
        where: { receiptNumber: ocr.receiptNumber, campaignId, status: { not: "REJECTED" } },
        select: { id: true },
      })
    : null;

  const blacklistedMatch = await prisma.receipt.findFirst({
    where: {
      campaignId,
      isBlacklisted: true,
      OR: [{ imageSha256 }, ...(ocr.receiptNumber ? [{ receiptNumber: ocr.receiptNumber }] : [])],
    },
    select: { id: true },
  });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const submissionsTodayForUser = await prisma.receipt.count({
    where: { userId, campaignId, submittedAt: { gte: startOfDay } },
  });

  const fraudCheck = runFraudChecks({
    campaign: {
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      minPurchaseAmountAed: Number(campaign.minPurchaseAmountAed),
      receiptConfidenceThreshold: campaign.receiptConfidenceThreshold,
      maxSubmissionsPerUserPerDay: campaign.maxSubmissionsPerUserPerDay,
    },
    user: { isBlacklisted: user.isBlacklisted },
    receipt: {
      receiptNumber: ocr.receiptNumber,
      transactionDate: ocr.transactionDate,
      totalAmount: ocr.totalAmount,
      subtotal: ocr.subtotal,
      taxAmount: ocr.taxAmount,
      ocrConfidence: ocr.confidence,
    },
    context: {
      duplicateReceiptNumberExists: Boolean(duplicateReceiptNumber),
      duplicateImageHashExists: Boolean(duplicateImage),
      submissionsTodayForUser,
      receiptIsBlacklisted: Boolean(blacklistedMatch),
    },
  });

  const eligible = eligibility.eligible && fraudCheck.passed;
  let status: ReceiptStatus;
  let rejectionReason: string | null = null;

  if (!eligibility.eligible) {
    status = "REJECTED";
    rejectionReason = "Please purchase a qualifying product to participate in this campaign."; // Brand-neutral for demo; matching logic still targets whichever brand is configured in fuzzyMatch.ts
  } else if (!fraudCheck.passed) {
    const hasCritical = fraudCheck.triggeredRules.some((r) => r.severity === "CRITICAL" || r.severity === "HIGH");
    status = hasCritical ? "REJECTED" : "FLAGGED";

    // RECEIPT_NUMBER_MISSING is intentionally non-blocking on its own (see
    // fraudDetection.ts), so it's never the reason status lands here by
    // itself — no special-cased message needed for it below.
    const lowConfidence = fraudCheck.triggeredRules.some((r) => r.rule === "LOW_OCR_CONFIDENCE");

    rejectionReason = lowConfidence
      ? "We couldn't clearly read this receipt. Please upload a clearer picture of the receipt and try again."
      : fraudCheck.triggeredRules.find((r) => r.severity === "CRITICAL" || r.severity === "HIGH")?.details ??
        fraudCheck.triggeredRules[0]?.details ??
        "This receipt requires manual review.";
  } else {
    status = "APPROVED";
  }

  const receipt = await prisma.receipt.create({
    data: {
      userId,
      campaignId,
      storeNameRaw: ocr.merchantName,
      storeNameNormalized: ocr.merchantName?.toLowerCase().trim() ?? null,
      receiptNumber: ocr.receiptNumber,
      transactionDate: ocr.transactionDate,
      currency: ocr.currency,
      totalAmount: ocr.totalAmount ?? undefined,
      subtotal: ocr.subtotal ?? undefined,
      taxAmount: ocr.taxAmount ?? undefined,
      imageUrl,
      imageSha256,
      ocrConfidence: ocr.confidence,
      ocrRawResult: JSON.stringify({ items: ocr.items }).slice(0, 4000),
      hayatnaProductDetected: eligibility.eligible,
      hayatnaConfidence: eligibility.confidence,
      status,
      rejectionReason,
      ipAddress,
      deviceFingerprint,
      verifiedAt: new Date(),
      items: {
        create: eligibility.itemMatches.map((m, idx) => ({
          rawText: ocr.items[idx]?.description ?? m.normalizedName,
          normalizedName: m.normalizedName,
          matchedSku: m.matchedSku,
          isHayatnaProduct: m.isHayatnaProduct,
          matchConfidence: m.matchConfidence,
          quantity: ocr.items[idx]?.quantity ?? undefined,
          unitPrice: ocr.items[idx]?.unitPrice ?? undefined,
          lineTotal: ocr.items[idx]?.totalPrice ?? undefined,
        })),
      },
    },
  });

  if (fraudCheck.triggeredRules.length > 0) {
    await prisma.fraudLog.createMany({
      data: fraudCheck.triggeredRules.map((rule) => ({
        userId,
        receiptId: receipt.id,
        ruleTriggered: rule.rule,
        severity: rule.severity,
        details: rule.details,
        ipAddress,
        deviceFingerprint,
      })),
    });
  }

  await sendNotification(userId, "RECEIPT_RECEIVED");
  await sendNotification(userId, status === "APPROVED" ? "RECEIPT_APPROVED" : "RECEIPT_REJECTED", "IN_APP", {
    reason: rejectionReason ?? "",
  });

  logger.info("Receipt processed", { receiptId: receipt.id, status, eligible });

  return {
    receiptId: receipt.id,
    status,
    eligible,
    confidence: eligibility.confidence,
    detectedProducts: eligibility.detectedProducts,
    rejectionReason,
    triggeredRules: fraudCheck.triggeredRules,
  };
}
