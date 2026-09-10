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
          { fullName: { contains: search } },
          { email: { contains: search } },
          { mobileNumber: { contains: search } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        mobileNumber: true,
        email: true,
        emirate: true,
        isBlacklisted: true,
        createdAt: true,
        _count: { select: { receipts: true, winners: true } },
      },
    }),
  ]);

  return apiSuccess({ users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}
