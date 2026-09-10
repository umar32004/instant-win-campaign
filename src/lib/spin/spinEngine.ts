import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface SpinCandidate {
  prizeId: string;
  name: string;
  probabilityWeight: number;
}

/**
 * Pure weighted-random selection — factored out from the DB-transactional
 * spin flow so it can be unit tested deterministically with an injected RNG.
 * Returns null only if `candidates` is empty.
 */
export function selectWeightedPrize(
  candidates: SpinCandidate[],
  rand: () => number = Math.random,
): SpinCandidate | null {
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, c) => sum + Math.max(0, c.probabilityWeight), 0);
  if (totalWeight <= 0) {
    // All weights zero/invalid — fall back to uniform random so a spin still resolves.
    return candidates[Math.floor(rand() * candidates.length)]!;
  }

  let ticket = rand() * totalWeight;
  for (const candidate of candidates) {
    ticket -= Math.max(0, candidate.probabilityWeight);
    if (ticket <= 0) return candidate;
  }
  return candidates[candidates.length - 1]!;
}

function generateWinnerCode(): string {
  return `HYW-${randomUUID().split("-")[0]!.toUpperCase()}`;
}

function generateRedemptionCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

export type SpinOutcome =
  | { status: "WON"; winnerId: string; winnerCode: string; prizeId: string; prizeName: string; redemptionCode: string }
  | { status: "NO_PRIZE_AVAILABLE" }
  | { status: "ALREADY_CLAIMED" };

/**
 * Executes the backend-authoritative spin for an eligible receipt. The
 * frontend never decides the prize — it only renders whichever result this
 * function returns. Inventory decrements use conditional `updateMany` calls
 * (an optimistic "affected-rows" check) instead of a naive read-then-write,
 * so concurrent spins from different users can never oversell a prize even
 * under high concurrency across multiple App Service instances.
 */
export async function executeSpin(campaignId: string, receiptId: string, userId: string): Promise<SpinOutcome> {
  const existingWinner = await prisma.winner.findUnique({ where: { receiptId } });
  if (existingWinner) {
    return { status: "ALREADY_CLAIMED" };
  }

  await resetExpiredCounters(campaignId);

  const prizes = await prisma.prize.findMany({
    where: { campaignId, isActive: true },
    include: { inventory: true },
    orderBy: { sortOrder: "asc" },
  });

  const eligiblePrizes = prizes.filter((p) => {
    const inv = p.inventory;
    if (!inv) return false;
    if (inv.remainingStock <= 0) return false;
    if (inv.dailyLimit !== null && inv.dailyAwarded >= inv.dailyLimit) return false;
    if (inv.weeklyLimit !== null && inv.weeklyAwarded >= inv.weeklyLimit) return false;
    if (inv.campaignLimit !== null && inv.campaignAwarded >= inv.campaignLimit) return false;
    return true;
  });

  // Try candidates in randomized-weighted order; if a concurrent spin already
  // claimed the last unit of the first pick, fall through to the next.
  let remaining = eligiblePrizes.map((p) => ({
    prizeId: p.id,
    name: p.name,
    probabilityWeight: p.probabilityWeight,
  }));

  while (remaining.length > 0) {
    const picked = selectWeightedPrize(remaining);
    if (!picked) break;

    const decremented = await prisma.prizeInventory.updateMany({
      where: {
        prizeId: picked.prizeId,
        remainingStock: { gt: 0 },
      },
      data: {
        remainingStock: { decrement: 1 },
        dailyAwarded: { increment: 1 },
        weeklyAwarded: { increment: 1 },
        campaignAwarded: { increment: 1 },
      },
    });

    if (decremented.count === 1) {
      const winner = await prisma.winner.create({
        data: {
          winnerCode: generateWinnerCode(),
          userId,
          receiptId,
          prizeId: picked.prizeId,
          campaignId,
          redemptionCode: generateRedemptionCode(),
          status: "PENDING_REDEMPTION",
        },
      });

      // Prize just hit zero stock — auto-deactivate so it stops appearing on the wheel.
      const updatedInventory = await prisma.prizeInventory.findUnique({ where: { prizeId: picked.prizeId } });
      if (updatedInventory && updatedInventory.remainingStock <= 0) {
        await prisma.prize.update({ where: { id: picked.prizeId }, data: { isActive: false } });
        logger.info("Prize auto-deactivated: inventory exhausted", { prizeId: picked.prizeId });
      }

      logger.info("Spin resolved", { receiptId, prizeId: picked.prizeId, winnerId: winner.id });

      return {
        status: "WON",
        winnerId: winner.id,
        winnerCode: winner.winnerCode,
        prizeId: picked.prizeId,
        prizeName: picked.name,
        redemptionCode: winner.redemptionCode,
      };
    }

    // Lost the race for this prize — remove it and retry with the remaining pool.
    remaining = remaining.filter((c) => c.prizeId !== picked.prizeId);
  }

  logger.warn("Spin resolved with no available prize inventory", { campaignId, receiptId });
  return { status: "NO_PRIZE_AVAILABLE" };
}

async function resetExpiredCounters(campaignId: string): Promise<void> {
  const now = new Date();
  await prisma.prizeInventory.updateMany({
    where: { prize: { campaignId }, lastDailyReset: { lt: new Date(now.getTime() - DAY_MS) } },
    data: { dailyAwarded: 0, lastDailyReset: now },
  });
  await prisma.prizeInventory.updateMany({
    where: { prize: { campaignId }, lastWeeklyReset: { lt: new Date(now.getTime() - WEEK_MS) } },
    data: { weeklyAwarded: 0, lastWeeklyReset: now },
  });
}
