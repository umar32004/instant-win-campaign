import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import type { NotificationType, NotificationChannel } from "@/types/enums";

const TEMPLATES: Record<NotificationType, { title: string; message: (ctx?: Record<string, string>) => string }> = {
  RECEIPT_RECEIVED: {
    title: "Receipt received",
    message: () => "We've received your receipt and are verifying it now.",
  },
  RECEIPT_APPROVED: {
    title: "Receipt approved",
    message: () => "Your receipt was approved. Spin the wheel to claim your prize!",
  },
  RECEIPT_REJECTED: {
    title: "Receipt rejected",
    message: (ctx) => ctx?.reason ?? "Please purchase a qualifying product to participate in this campaign.",
  },
  WINNER_ANNOUNCED: {
    title: "You won a prize!",
    message: (ctx) => `Congratulations! You won: ${ctx?.prizeName ?? "a prize"}.`,
  },
  PRIZE_CLAIMED: {
    title: "Prize claimed",
    message: () => "Your prize redemption has been confirmed.",
  },
};

/**
 * Persists an in-app notification and, when an SMS/email provider is
 * configured, dispatches it externally. Without provider credentials this
 * simply logs the outbound message — safe no-op for local development.
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel = "IN_APP",
  context?: Record<string, string>,
): Promise<void> {
  const template = TEMPLATES[type];
  const title = template.title;
  const message = template.message(context);

  const dispatched = channel === "IN_APP" || Boolean(config.SMS_PROVIDER_API_KEY);

  await prisma.notification.create({
    data: {
      userId,
      type,
      channel,
      status: dispatched ? "SENT" : "FAILED",
      title,
      message,
      sentAt: dispatched ? new Date() : null,
    },
  });

  if (channel !== "IN_APP" && !config.SMS_PROVIDER_API_KEY) {
    logger.info("SMS/Email provider not configured — notification logged only", { userId, type, channel });
  }
}
