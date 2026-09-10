/**
 * Fuzzy brand/product matching for Hayatna SKUs against noisy OCR output.
 *
 * Receipts are scanned photos run through OCR, so brand names routinely come
 * back misspelled, missing letters, or with adjacent-key typos ("HYTNA",
 * "HAYTNA", "HAYATNA" vs "HAYATANA"). Rather than exact/substring matching,
 * every token on a receipt is scored against known brand spellings using
 * normalized Levenshtein similarity, so a single-character OCR error still
 * clears the confidence threshold while genuinely unrelated brands don't.
 */

// -----------------------------------------------------------------------------
// TEMPORARY TEST SWAP — matching Clorox instead of Hayatna so real test
// receipts (no Hayatna receipts on hand yet) can exercise the full pipeline.
// To revert to Hayatna, restore the commented-out block below and delete the
// Clorox one (or vice versa next time you need to swap again).
// -----------------------------------------------------------------------------
export const HAYATNA_BRAND_VARIANTS = [
  "clorox",
  "clorx",
  "cloroxs",
  "clorax",
  "cl0rox",
  "ciorox",
  "clrx",
  "clx",
  "clrox",
  "كلوركس", // Arabic spelling seen on UAE receipts
] as const;

export interface ProductKeyword {
  productType: string;
  variants: string[];
}

export const HAYATNA_PRODUCT_KEYWORDS: ProductKeyword[] = [
  { productType: "Bleach", variants: ["bleach"] },
  { productType: "Bathroom Cleaner", variants: ["bath", "clnr", "cleaner", "bathroom"] },
  { productType: "Disinfecting Wipes", variants: ["wipes", "disinfect"] },
  { productType: "Multi-Surface Spray", variants: ["spray", "surface"] },
  { productType: "Toilet Bowl Cleaner", variants: ["toilet", "bowl"] },
];

// --- Original Hayatna values (restore these to switch back) -----------------
// export const HAYATNA_BRAND_VARIANTS = [
//   "hayatna",
//   "hytna",
//   "haytna",
//   "hyatna",
//   "hayatana",
//   "hayatnaa",
//   "hayatn",
//   "حياتنا", // Arabic brand spelling
// ] as const;
//
// export const HAYATNA_PRODUCT_KEYWORDS: ProductKeyword[] = [
//   { productType: "Fresh Milk", variants: ["milk", "fresh milk", "حليب"] },
//   { productType: "Laban", variants: ["laban", "لبن"] },
//   { productType: "Yogurt", variants: ["yogurt", "yoghurt", "زبادي"] },
//   { productType: "Juice", variants: ["juice", "عصير"] },
//   { productType: "Cheese", variants: ["cheese", "جبن"] },
// ];

/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = new Array(b.length + 1);
  let currRow = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prevRow[j] = j;

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost, // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[b.length];
}

/** Normalized similarity in [0, 1]; 1 = identical, 0 = completely different. */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Lowercases, strips diacritics/punctuation, and collapses whitespace. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip Latin diacritics
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ") // keep Arabic + alphanumerics
    .replace(/\s+/g, " ")
    .trim();
}

export interface BrandMatchResult {
  matched: boolean;
  confidence: number;
  matchedToken?: string;
  matchedVariant?: string;
}

/**
 * Scans every whitespace-delimited token in `text` for the best fuzzy match
 * against known Hayatna brand spellings.
 */
export function matchHayatnaBrand(text: string, threshold: number): BrandMatchResult {
  const normalized = normalizeText(text);
  const tokens = normalized.split(" ").filter((t) => t.length >= 3);

  let best: BrandMatchResult = { matched: false, confidence: 0 };

  for (const token of tokens) {
    for (const variant of HAYATNA_BRAND_VARIANTS) {
      const score = similarity(token, variant);
      if (score > best.confidence) {
        best = { matched: score >= threshold, confidence: score, matchedToken: token, matchedVariant: variant };
      }
    }
  }

  return best;
}

export interface ProductMatchResult extends BrandMatchResult {
  productType?: string;
}

/**
 * Full product-line match: requires a fuzzy brand hit AND a recognizable
 * Hayatna product keyword (milk, laban, yogurt, juice, cheese, ...) somewhere
 * in the same line, which sharply reduces false positives from unrelated
 * items that merely contain a brand-like token.
 */
export function matchHayatnaProductLine(lineText: string, threshold: number): ProductMatchResult {
  const brandMatch = matchHayatnaBrand(lineText, threshold);
  if (!brandMatch.matched) return brandMatch;

  const normalized = normalizeText(lineText);
  for (const keyword of HAYATNA_PRODUCT_KEYWORDS) {
    for (const variant of keyword.variants) {
      if (normalized.includes(variant)) {
        return { ...brandMatch, productType: keyword.productType };
      }
    }
  }

  // Brand matched but no recognized product keyword — still a plausible
  // Hayatna SKU (e.g. a new product not in our keyword list), just without a
  // classified product type. Slightly discount confidence for this case.
  return { ...brandMatch, confidence: Math.max(0, brandMatch.confidence - 0.08) };
}
