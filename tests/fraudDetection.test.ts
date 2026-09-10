import { describe, it, expect } from "vitest";
import { runFraudChecks, type FraudCheckInput } from "@/lib/fraud/fraudDetection";

function baseInput(overrides: Partial<FraudCheckInput> = {}): FraudCheckInput {
  const now = new Date();
  return {
    campaign: {
      status: "ACTIVE",
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      minPurchaseAmountAed: 0,
      receiptConfidenceThreshold: 0.6,
      maxSubmissionsPerUserPerDay: 3,
    },
    user: { isBlacklisted: false },
    receipt: {
      receiptNumber: "INV-001",
      transactionDate: now,
      totalAmount: 50,
      subtotal: 47.5,
      taxAmount: 2.5,
      ocrConfidence: 0.9,
    },
    context: {
      duplicateReceiptNumberExists: false,
      duplicateImageHashExists: false,
      submissionsTodayForUser: 0,
      receiptIsBlacklisted: false,
    },
    ...overrides,
  };
}

describe("runFraudChecks", () => {
  it("passes a clean, valid submission", () => {
    const result = runFraudChecks(baseInput());
    expect(result.passed).toBe(true);
    expect(result.triggeredRules).toHaveLength(0);
  });

  it("blocks blacklisted users", () => {
    const result = runFraudChecks(baseInput({ user: { isBlacklisted: true } }));
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("BLACKLISTED_USER");
  });

  it("blocks duplicate receipt numbers", () => {
    const result = runFraudChecks(
      baseInput({ context: { duplicateReceiptNumberExists: true, duplicateImageHashExists: false, submissionsTodayForUser: 0, receiptIsBlacklisted: false } }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("DUPLICATE_RECEIPT_NUMBER");
  });

  it("blocks duplicate image hashes", () => {
    const result = runFraudChecks(
      baseInput({ context: { duplicateReceiptNumberExists: false, duplicateImageHashExists: true, submissionsTodayForUser: 0, receiptIsBlacklisted: false } }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("DUPLICATE_IMAGE_HASH");
  });

  it("blocks when the daily submission limit is reached", () => {
    const result = runFraudChecks(
      baseInput({ context: { duplicateReceiptNumberExists: false, duplicateImageHashExists: false, submissionsTodayForUser: 3, receiptIsBlacklisted: false } }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("SUBMISSION_LIMIT_EXCEEDED");
  });

  it("blocks receipts below the confidence threshold", () => {
    const result = runFraudChecks(
      baseInput({ receipt: { receiptNumber: "INV-001", transactionDate: new Date(), totalAmount: 50, subtotal: 47.5, taxAmount: 2.5, ocrConfidence: 0.3 } }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("LOW_OCR_CONFIDENCE");
  });

  it("blocks receipts below the minimum purchase amount", () => {
    const result = runFraudChecks(
      baseInput({
        campaign: { status: "ACTIVE", startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000), minPurchaseAmountAed: 100, receiptConfidenceThreshold: 0.6, maxSubmissionsPerUserPerDay: 3 },
      }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("MIN_PURCHASE_NOT_MET");
  });

  it("blocks when the campaign is not active", () => {
    const result = runFraudChecks(baseInput({ campaign: { ...baseInput().campaign, status: "PAUSED" } }));
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("RECEIPT_DATE_OUTSIDE_CAMPAIGN");
  });

  it("flags receipts where subtotal + tax disagree with the printed total (possible tampering)", () => {
    const result = runFraudChecks(
      baseInput({ receipt: { receiptNumber: "INV-001", transactionDate: new Date(), totalAmount: 500, subtotal: 47.5, taxAmount: 2.5, ocrConfidence: 0.9 } }),
    );
    expect(result.passed).toBe(false);
    expect(result.triggeredRules.map((r) => r.rule)).toContain("SUSPECTED_EDITED_IMAGE");
  });

  it("flags a missing transaction date but does not block on it alone (cropped product-only photos)", () => {
    const result = runFraudChecks(
      baseInput({ receipt: { receiptNumber: "INV-001", transactionDate: null, totalAmount: 50, subtotal: 47.5, taxAmount: 2.5, ocrConfidence: 0.9 } }),
    );
    expect(result.triggeredRules.map((r) => r.rule)).toContain("RECEIPT_DATE_INVALID");
    expect(result.passed).toBe(true);
  });

  it("logs a missing receipt number but does not block on it alone (barcode-only receipt formats)", () => {
    // Real UAE Carrefour receipts often print no plain-text invoice number at
    // all, only a barcode — this must never cost a legitimate customer their
    // entry, even though it's still logged for admin visibility.
    const result = runFraudChecks(
      baseInput({ receipt: { receiptNumber: null, transactionDate: new Date(), totalAmount: 50, subtotal: 47.5, taxAmount: 2.5, ocrConfidence: 0.9 } }),
    );
    expect(result.passed).toBe(true);
    const rule = result.triggeredRules.find((r) => r.rule === "RECEIPT_NUMBER_MISSING");
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe("LOW");
    expect(rule?.details).toMatch(/receipt number/i);
  });
});
