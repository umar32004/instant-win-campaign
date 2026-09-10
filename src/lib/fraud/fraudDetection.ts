import type { FraudRule, FraudSeverity } from "@/types/enums";

export interface TriggeredFraudRule {
  rule: FraudRule;
  severity: FraudSeverity;
  details: string;
}

export interface FraudCheckInput {
  campaign: {
    status: string;
    startDate: Date;
    endDate: Date;
    minPurchaseAmountAed: number;
    receiptConfidenceThreshold: number;
    maxSubmissionsPerUserPerDay: number;
  };
  user: {
    isBlacklisted: boolean;
  };
  receipt: {
    receiptNumber: string | null;
    transactionDate: Date | null;
    totalAmount: number | null;
    subtotal: number | null;
    taxAmount: number | null;
    ocrConfidence: number;
  };
  /** Pre-computed lookups from the caller (kept out of this pure function for testability). */
  context: {
    duplicateReceiptNumberExists: boolean;
    duplicateImageHashExists: boolean;
    submissionsTodayForUser: number;
    receiptIsBlacklisted: boolean;
  };
}

export interface FraudCheckResult {
  /** True only if zero rules of severity MEDIUM or above were triggered. */
  passed: boolean;
  triggeredRules: TriggeredFraudRule[];
}

const BLOCKING_SEVERITIES: FraudSeverity[] = ["MEDIUM", "HIGH", "CRITICAL"];

/**
 * Runs the full fraud/eligibility rule set against a single receipt
 * submission. This is a pure function — all duplicate/lookup checks are
 * pre-computed by the caller (API route) so the rule logic itself stays
 * simple to unit test without a database.
 */
export function runFraudChecks(input: FraudCheckInput): FraudCheckResult {
  const rules: TriggeredFraudRule[] = [];
  const { campaign, user, receipt, context } = input;

  if (user.isBlacklisted) {
    rules.push({
      rule: "BLACKLISTED_USER",
      severity: "CRITICAL",
      details: "This user account has been blacklisted from the campaign.",
    });
  }

  if (context.receiptIsBlacklisted) {
    rules.push({
      rule: "DUPLICATE_RECEIPT_NUMBER",
      severity: "CRITICAL",
      details: "This receipt has been blacklisted by an administrator.",
    });
  }

  if (campaign.status !== "ACTIVE") {
    rules.push({
      rule: "RECEIPT_DATE_OUTSIDE_CAMPAIGN",
      severity: "CRITICAL",
      details: `Campaign is not currently active (status: ${campaign.status}).`,
    });
  } else {
    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      rules.push({
        rule: "RECEIPT_DATE_OUTSIDE_CAMPAIGN",
        severity: "CRITICAL",
        details: "Submission received outside the campaign's active date range.",
      });
    }
  }

  if (context.duplicateReceiptNumberExists) {
    rules.push({
      rule: "DUPLICATE_RECEIPT_NUMBER",
      severity: "CRITICAL",
      details: `Receipt number ${receipt.receiptNumber ?? "(unknown)"} has already been used in this campaign.`,
    });
  }

  if (context.duplicateImageHashExists) {
    rules.push({
      rule: "DUPLICATE_IMAGE_HASH",
      severity: "CRITICAL",
      details: "This exact receipt image has already been submitted.",
    });
  }

  if (context.submissionsTodayForUser >= campaign.maxSubmissionsPerUserPerDay) {
    rules.push({
      rule: "SUBMISSION_LIMIT_EXCEEDED",
      severity: "HIGH",
      details: `User has reached the daily submission limit (${campaign.maxSubmissionsPerUserPerDay}).`,
    });
  }

  if (!receipt.receiptNumber) {
    // Non-blocking: some receipts (e.g. real Carrefour UAE receipts) print
    // no plain-text invoice number at all, only a barcode — the OCR layer
    // already tries a barcode-digit fallback before this ever fires, so by
    // the time we get here it genuinely couldn't find any identifier. That
    // shouldn't cost a legitimate customer their entry; it's logged (not
    // blocking) so admins can still see it happened, and duplicate-image
    // detection remains the fallback fraud check for these receipts.
    rules.push({
      rule: "RECEIPT_NUMBER_MISSING",
      severity: "LOW",
      details: "Please upload a photo where both the receipt number and the Clorox product are clearly visible.",
    });
  }

  if (!receipt.transactionDate) {
    // Missing date alone is not disqualifying — see RECEIPT_NUMBER_MISSING
    // above for the same reasoning. Logged at LOW severity (non-blocking)
    // purely for admin visibility.
    rules.push({
      rule: "RECEIPT_DATE_INVALID",
      severity: "LOW",
      details: "Could not extract a valid transaction date from the receipt.",
    });
  } else {
    const transactionDate = receipt.transactionDate;
    const now = new Date();
    // NOTE: the "older than 31 days" check is TEMPORARILY REMOVED for testing
    // with older real receipts — restore it before going back to
    // production/live campaign use:
    //
    //   const thirtyOneDaysMs = 31 * 24 * 60 * 60 * 1000;
    //   else if (now.getTime() - transactionDate.getTime() > thirtyOneDaysMs) {
    //     rules.push({ rule: "RECEIPT_DATE_INVALID", severity: "MEDIUM",
    //       details: "Receipt is older than the 31-day acceptance window." });
    //   }
    if (transactionDate.getTime() > now.getTime() + 60_000) {
      rules.push({
        rule: "RECEIPT_DATE_INVALID",
        severity: "HIGH",
        details: "Receipt transaction date is in the future.",
      });
    } else if (transactionDate < campaign.startDate || transactionDate > campaign.endDate) {
      rules.push({
        rule: "RECEIPT_DATE_OUTSIDE_CAMPAIGN",
        severity: "HIGH",
        details: "Receipt transaction date falls outside the campaign period.",
      });
    }
  }

  if (receipt.ocrConfidence < campaign.receiptConfidenceThreshold) {
    rules.push({
      rule: "LOW_OCR_CONFIDENCE",
      severity: "HIGH",
      details: `OCR confidence ${(receipt.ocrConfidence * 100).toFixed(0)}% is below the required ${(campaign.receiptConfidenceThreshold * 100).toFixed(0)}% threshold.`,
    });
  }

  if ((receipt.totalAmount ?? 0) < campaign.minPurchaseAmountAed) {
    rules.push({
      rule: "MIN_PURCHASE_NOT_MET",
      severity: "HIGH",
      details: `Receipt total AED ${receipt.totalAmount ?? 0} is below the minimum purchase amount of AED ${campaign.minPurchaseAmountAed}.`,
    });
  }

  // Heuristic tamper check: if subtotal + tax materially disagrees with the
  // printed total, the receipt may have been digitally edited. This is a
  // lightweight heuristic, not forensic image analysis.
  if (receipt.subtotal !== null && receipt.taxAmount !== null && receipt.totalAmount !== null) {
    const expectedTotal = receipt.subtotal + receipt.taxAmount;
    const discrepancy = Math.abs(expectedTotal - receipt.totalAmount);
    if (discrepancy > Math.max(1, receipt.totalAmount * 0.03)) {
      rules.push({
        rule: "SUSPECTED_EDITED_IMAGE",
        severity: "MEDIUM",
        details: `Subtotal + tax (${expectedTotal.toFixed(2)}) does not reconcile with the printed total (${receipt.totalAmount.toFixed(2)}).`,
      });
    }
  }

  const passed = !rules.some((r) => BLOCKING_SEVERITIES.includes(r.severity));

  return { passed, triggeredRules: rules };
}
