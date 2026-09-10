import { describe, it, expect } from "vitest";
import { selectWeightedPrize, type SpinCandidate } from "@/lib/spin/spinEngine";

describe("selectWeightedPrize", () => {
  it("returns null for an empty candidate list", () => {
    expect(selectWeightedPrize([])).toBeNull();
  });

  it("returns the only candidate when there's just one", () => {
    const candidates: SpinCandidate[] = [{ prizeId: "a", name: "A", probabilityWeight: 5 }];
    expect(selectWeightedPrize(candidates)?.prizeId).toBe("a");
  });

  it("always picks the candidate whose ticket range the random draw lands in", () => {
    const candidates: SpinCandidate[] = [
      { prizeId: "a", name: "A", probabilityWeight: 1 }, // ticket range [0, 1)
      { prizeId: "b", name: "B", probabilityWeight: 3 }, // ticket range [1, 4)
    ];

    // rand() * totalWeight(4) = 0.1 -> falls in A's range
    expect(selectWeightedPrize(candidates, () => 0.1 / 4)?.prizeId).toBe("a");
    // rand() * 4 = 3.9 -> falls in B's range
    expect(selectWeightedPrize(candidates, () => 3.9 / 4)?.prizeId).toBe("b");
  });

  it("falls back to uniform selection when all weights are zero", () => {
    const candidates: SpinCandidate[] = [
      { prizeId: "a", name: "A", probabilityWeight: 0 },
      { prizeId: "b", name: "B", probabilityWeight: 0 },
    ];
    const picked = selectWeightedPrize(candidates, () => 0.99);
    expect(["a", "b"]).toContain(picked?.prizeId);
  });

  it("approximates the configured probability distribution over many trials", () => {
    const candidates: SpinCandidate[] = [
      { prizeId: "common", name: "Common", probabilityWeight: 90 },
      { prizeId: "rare", name: "Rare", probabilityWeight: 10 },
    ];

    let commonCount = 0;
    const trials = 20_000;
    for (let i = 0; i < trials; i++) {
      const result = selectWeightedPrize(candidates, Math.random);
      if (result?.prizeId === "common") commonCount++;
    }

    const ratio = commonCount / trials;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });
});
