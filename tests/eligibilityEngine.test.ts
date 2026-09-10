import { describe, it, expect } from "vitest";
import { evaluateHayatnaEligibility } from "@/lib/eligibility/eligibilityEngine";
import type { ReceiptOcrResult } from "@/lib/azure/documentIntelligence";

function makeOcr(overrides: Partial<ReceiptOcrResult> = {}): ReceiptOcrResult {
  return {
    merchantName: "Lulu Hypermarket",
    receiptNumber: "INV-123",
    transactionDate: new Date(),
    currency: "AED",
    totalAmount: 50,
    subtotal: 47.5,
    taxAmount: 2.5,
    items: [],
    confidence: 0.9,
    rawText: "",
    ...overrides,
  };
}

describe("evaluateHayatnaEligibility", () => {
  it("is eligible when a Hayatna product is in the structured items", () => {
    const ocr = makeOcr({
      items: [
        { description: "HAYATNA FRESH MILK 1L", quantity: 1, unitPrice: 6.5, totalPrice: 6.5 },
        { description: "AL AIN WATER 12X500ML", quantity: 1, unitPrice: 10, totalPrice: 10 },
      ],
    });

    const result = evaluateHayatnaEligibility(ocr, 0.72);
    expect(result.eligible).toBe(true);
    expect(result.detectedProducts).toHaveLength(1);
    expect(result.detectedProducts[0]?.productType).toBe("Fresh Milk");
    expect(result.itemMatches[0]?.isHayatnaProduct).toBe(true);
    expect(result.itemMatches[1]?.isHayatnaProduct).toBe(false);
  });

  it("is not eligible when no items match", () => {
    const ocr = makeOcr({
      items: [{ description: "NESTLE PURE LIFE WATER", quantity: 1, unitPrice: 5, totalPrice: 5 }],
    });

    const result = evaluateHayatnaEligibility(ocr, 0.72);
    expect(result.eligible).toBe(false);
    expect(result.detectedProducts).toHaveLength(0);
    expect(result.reason).toMatch(/no hayatna product/i);
  });

  it("falls back to raw OCR text when no structured items are present", () => {
    const ocr = makeOcr({ items: [], rawText: "HYTNA LABAN 1L\nLIPTON TEA 100 BAGS" });

    const result = evaluateHayatnaEligibility(ocr, 0.72);
    expect(result.eligible).toBe(true);
    expect(result.detectedProducts[0]?.productType).toBe("Laban");
  });

  it("respects a stricter fuzzy match threshold", () => {
    // "HAYATBA" is not one of the pre-registered known misspellings, so its
    // best match is a fuzzy ~0.857 similarity against "hayatna" — enough to
    // clear a lenient threshold but not a strict one.
    const ocr = makeOcr({
      items: [{ description: "HAYATBA LABAN 1L", quantity: 1, unitPrice: 5, totalPrice: 5 }],
    });

    const lenient = evaluateHayatnaEligibility(ocr, 0.6);
    const strict = evaluateHayatnaEligibility(ocr, 0.95);

    expect(lenient.eligible).toBe(true);
    expect(strict.eligible).toBe(false);
  });
});
