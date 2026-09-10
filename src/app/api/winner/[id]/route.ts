import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const winner = await prisma.winner.findFirst({
    where: { OR: [{ id }, { winnerCode: id }] },
    include: { prize: true, user: { select: { fullName: true } } },
  });

  if (!winner) {
    return apiError("Winner record not found.", 404);
  }

  return apiSuccess({
    winner: {
      winnerCode: winner.winnerCode,
      prizeName: winner.prize.name,
      prizeImageUrl: winner.prize.imageUrl,
      storeName: winner.storeName,
      wonAt: winner.wonAt,
      status: winner.status,
      redemptionCode: winner.redemptionCode,
      winnerFirstName: winner.user.fullName.split(" ")[0] ?? "Winner",
    },
  });
}
