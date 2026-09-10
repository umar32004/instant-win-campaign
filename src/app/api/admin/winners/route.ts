import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { paginationSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return apiError("Unauthorized", 401);

  const { page, pageSize, search } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const where = search
    ? {
        OR: [
          { winnerCode: { contains: search } },
          { redemptionCode: { contains: search } },
          { user: { fullName: { contains: search } } },
          { user: { email: { contains: search } } },
        ],
      }
    : {};

  const [total, winners] = await Promise.all([
    prisma.winner.count({ where }),
    prisma.winner.findMany({
      where,
      orderBy: { wonAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { fullName: true, email: true, mobileNumber: true } },
        prize: { select: { name: true, tier: true } },
        receipt: { select: { receiptNumber: true, storeNameRaw: true } },
      },
    }),
  ]);

  return apiSuccess({ winners, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
