import type { ReceiptOcrResult } from "@/lib/azure/documentIntelligence";
import { matchHayatnaProductLine } from "@/lib/matching/fuzzyMatch";

export interface DetectedProduct {
  name: string;
  productType?: string;
  confidence: number;
}

export interface ItemMatch {
  index: number;
  isHayatnaProduct: boolean;
  matchConfidence: number;
  matchedSku?: string;
  normalizedName: string;
}

export interface EligibilityResult {
  eligible: boolean;
  confidence: number;
  detectedProducts: DetectedProduct[];
  itemMatches: ItemMatch[];
  reason: string;
}

/**
 * AI validation step run after OCR extraction: determines whether the
 * receipt contains at least one Hayatna product, using fuzzy brand+keyword
 * matching across both structured line items and the raw OCR text (as a
 * fallback for receipts where line items weren't segmented cleanly).
 */
export function evaluateHayatnaEligibility(
  ocr: ReceiptOcrResult,
  fuzzyMatchThreshold: number,
): EligibilityResult {
  const itemMatches: ItemMatch[] = [];
  const detectedProducts: DetectedProduct[] = [];

  ocr.items.forEach((item, index) => {
    const match = matchHayatnaProductLine(item.description, fuzzyMatchThreshold);
    itemMatches.push({
      index,
      isHayatnaProduct: match.matched,
      matchConfidence: Math.round(match.confidence * 100) / 100,
      matchedSku: match.matched
        ? `HAYATNA_${(match.productType ?? "GENERIC").toUpperCase().replace(/\s+/g, "_")}`
        : undefined,
      normalizedName: item.description.trim(),
    });

    if (match.matched) {
      detectedProducts.push({
        name: item.description.trim(),
        productType: match.productType,
        confidence: Math.round(match.confidence * 100) / 100,
      });
    }
  });

  // Fallback: if no structured items matched (or none were extracted), scan
  // the raw OCR text in case line-item segmentation missed the product line.
  if (detectedProducts.length === 0 && ocr.rawText) {
    const lines = ocr.rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const match = matchHayatnaProductLine(line, fuzzyMatchThreshold);
      if (match.matched) {
        detectedProducts.push({
          name: line,
          productType: match.productType,
          confidence: Math.round(match.confidence * 100) / 100,
        });
      }
    }
  }

  const eligible = detectedProducts.length > 0;
  const confidence = eligible
    ? Math.max(...detectedProducts.map((p) => p.confidence))
    : 0;

  const reason = eligible
    ? `Detected ${detectedProducts.length} qualifying product(s) on the receipt with ${(confidence * 100).toFixed(0)}% confidence.`
    : "No qualifying product could be identified on this receipt.";

  return { eligible, confidence, detectedProducts, itemMatches, reason };
}
