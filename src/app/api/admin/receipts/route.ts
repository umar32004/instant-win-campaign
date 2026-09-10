import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { paginationSchema } from "@/lib/validation/schemas";
import { RECEIPT_STATUS } from "@/types/enums";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return apiError("Unauthorized", 401);

  const { page, pageSize, search } = paginationSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const statusParam = req.nextUrl.searchParams.get("status");
  const status = statusParam && (RECEIPT_STATUS as readonly string[]).includes(statusParam) ? statusParam : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { receiptNumber: { contains: search } },
            { storeNameRaw: { contains: search } },
            { user: { fullName: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const [total, receipts] = await Promise.all([
    prisma.receipt.count({ where }),
    prisma.receipt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { fullName: true, email: true, mobileNumber: true } },
        winner: { select: { id: true, winnerCode: true } },
      },
    }),
  ]);

  return apiSuccess({ receipts, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
