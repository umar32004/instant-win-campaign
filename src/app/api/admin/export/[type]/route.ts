import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/apiResponse";
import { requireAdmin } from "@/lib/adminGuard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rateLimit";

const EXPORTABLE_TYPES = ["users", "receipts", "winners"] as const;
type ExportableType = (typeof EXPORTABLE_TYPES)[number];

async function fetchRows(type: ExportableType) {
  if (type === "users") {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10_000 });
    return users.map((u) => ({
      ID: u.id,
      "Full Name": u.fullName,
      Mobile: u.mobileNumber,
      Email: u.email,
      Emirate: u.emirate,
      Blacklisted: u.isBlacklisted ? "Yes" : "No",
      "Registered At": u.createdAt.toISOString(),
    }));
  }
  if (type === "receipts") {
    const receipts = await prisma.receipt.findMany({
      orderBy: { submittedAt: "desc" },
      take: 10_000,
      include: { user: { select: { fullName: true, email: true } } },
    });
    return receipts.map((r) => ({
      ID: r.id,
      User: r.user.fullName,
      Email: r.user.email,
      Store: r.storeNameRaw ?? "",
      "Receipt #": r.receiptNumber ?? "",
      Total: r.totalAmount?.toString() ?? "",
      Status: r.status,
      "OCR Confidence": r.ocrConfidence?.toFixed(2) ?? "",
      "Product Detected": r.hayatnaProductDetected ? "Yes" : "No",
      "Submitted At": r.submittedAt.toISOString(),
    }));
  }
  const winners = await prisma.winner.findMany({
    orderBy: { wonAt: "desc" },
    take: 10_000,
    include: { user: { select: { fullName: true, email: true } }, prize: { select: { name: true } } },
  });
  return winners.map((w) => ({
    "Winner Code": w.winnerCode,
    User: w.user.fullName,
    Email: w.user.email,
    Prize: w.prize.name,
    Store: w.storeName ?? "",
    Status: w.status,
    "Redemption Code": w.redemptionCode,
    "Won At": w.wonAt.toISOString(),
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const admin = await requireAdmin(req, ["SUPER_ADMIN", "ADMIN"]);
  if (!admin) return apiError("Unauthorized", 401);

  const { type: rawType } = await params;
  if (!EXPORTABLE_TYPES.includes(rawType as ExportableType)) {
    return apiError("Invalid export type. Use users, receipts, or winners.", 400);
  }
  const type = rawType as ExportableType;
  const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await fetchRows(type);

  await writeAuditLog({
    actorType: "ADMIN",
    actorId: admin.sub,
    action: "DATA_EXPORTED",
    entityType: type,
    metadata: { format, rowCount: rows.length },
    ipAddress: clientIpFromHeaders(req.headers),
  });

  if (rows.length === 0) {
    return NextResponse.json({ success: true, message: "No rows to export." }, { status: 200 });
  }

  const headers = Object.keys(rows[0]!);

  if (format === "csv") {
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const value = String((row as Record<string, unknown>)[h] ?? "");
            return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(","),
      ),
    ];
    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-export.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type);
  sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-export.xlsx"`,
    },
  });
}
