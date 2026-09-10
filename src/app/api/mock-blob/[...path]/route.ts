import { NextRequest, NextResponse } from "next/server";
import { readLocalMockBlob } from "@/lib/azure/blobStorage";
import { requireAdmin } from "@/lib/adminGuard";
import { isMockBlobStorage } from "@/lib/config";

/**
 * Serves locally-stored receipt uploads when running in mock cloud mode
 * (no Azure Blob Storage credentials configured). Never used in production —
 * real deployments serve receipt images via short-lived Azure Blob SAS URLs.
 * Access is restricted to authenticated admins since receipts contain PII.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isMockBlobStorage) {
    return NextResponse.json({ error: "Mock blob storage is disabled" }, { status: 404 });
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const relativePath = path.join("/");
  const buffer = await readLocalMockBlob(relativePath);
  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = relativePath.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "png" ? "image/png" : ext === "pdf" ? "application/pdf" : "image/jpeg";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=60",
    },
  });
}
