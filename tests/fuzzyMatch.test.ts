import { describe, it, expect } from "vitest";
import { levenshtein, similarity, matchHayatnaBrand, matchHayatnaProductLine } from "@/lib/matching/fuzzyMatch";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hayatna", "hayatna")).toBe(0);
  });

  it("counts single-character edits", () => {
    expect(levenshtein("hayatna", "hayatn")).toBe(1); // deletion
    expect(levenshtein("hayatna", "hayatnaa")).toBe(1); // insertion
    expect(levenshtein("hayatna", "hayatma")).toBe(1); // substitution
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("hayatna", "hayatna")).toBe(1);
  });

  it("is 0 for completely different single-character strings of same length", () => {
    expect(similarity("a", "b")).toBe(0);
  });

  it("is between 0 and 1 for partial matches", () => {
    const score = similarity("hayatna", "hytna");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("matchHayatnaBrand", () => {
  const threshold = 0.72;

  it("matches the exact brand name", () => {
    const result = matchHayatnaBrand("HAYATNA FRESH MILK 1L", threshold);
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("matches common OCR misspellings", () => {
    for (const misspelling of ["HYTNA", "HAYTNA", "HYATNA"]) {
      const result = matchHayatnaBrand(`${misspelling} FRESH MILK 1L`, threshold);
      expect(result.matched, `expected "${misspelling}" to match`).toBe(true);
    }
  });

  it("does not match unrelated brands", () => {
    const result = matchHayatnaBrand("NESTLE PURE LIFE WATER 1.5L", threshold);
    expect(result.matched).toBe(false);
  });

  it("does not match short unrelated tokens", () => {
    const result = matchHayatnaBrand("AL AIN WATER 12X500ML", threshold);
    expect(result.matched).toBe(false);
  });
});

describe("matchHayatnaProductLine", () => {
  const threshold = 0.72;

  it("classifies product type when brand and keyword both match", () => {
    const result = matchHayatnaProductLine("HAYATNA FRESH MILK 1L", threshold);
    expect(result.matched).toBe(true);
    expect(result.productType).toBe("Fresh Milk");
  });

  it("still matches brand-only lines with a small confidence discount", () => {
    const withKeyword = matchHayatnaProductLine("HAYATNA FRESH MILK 1L", threshold);
    const withoutKeyword = matchHayatnaProductLine("HAYATNA SPECIAL EDITION PACK", threshold);
    expect(withoutKeyword.matched).toBe(true);
    expect(withoutKeyword.productType).toBeUndefined();
    expect(withoutKeyword.confidence).toBeLessThan(withKeyword.confidence);
  });

  it("rejects lines with no brand match at all", () => {
    const result = matchHayatnaProductLine("INDOMIE NOODLES CHICKEN", threshold);
    expect(result.matched).toBe(false);
  });
});
