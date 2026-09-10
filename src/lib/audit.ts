import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ActorType } from "@/types/enums";

export async function writeAuditLog(entry: {
  actorType: ActorType;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata).slice(0, 4000) : null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary request flow.
    logger.error("Failed to write audit log", { err: String(err), action: entry.action });
  }
}
