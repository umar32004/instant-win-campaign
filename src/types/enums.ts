/**
 * Canonical string-union "enums" for columns that are plain strings at the DB
 * layer (SQL Server / Prisma does not support native enum types). These are
 * the single source of truth — validated at the API boundary via zod.
 */

export const CAMPAIGN_STATUS = ["DRAFT", "ACTIVE", "PAUSED", "ENDED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

export const RECEIPT_STATUS = [
  "PENDING",
  "PROCESSING",
  "APPROVED",
  "REJECTED",
  "FLAGGED",
] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUS)[number];

export const WINNER_STATUS = [
  "PENDING_REDEMPTION",
  "REDEEMED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type WinnerStatus = (typeof WINNER_STATUS)[number];

export const ADMIN_ROLE = ["SUPER_ADMIN", "ADMIN", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLE)[number];

export const PRIZE_TIER = ["STANDARD", "PREMIUM", "GRAND"] as const;
export type PrizeTier = (typeof PRIZE_TIER)[number];

export const NOTIFICATION_TYPE = [
  "RECEIPT_RECEIVED",
  "RECEIPT_APPROVED",
  "RECEIPT_REJECTED",
  "WINNER_ANNOUNCED",
  "PRIZE_CLAIMED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

export const NOTIFICATION_CHANNEL = ["SMS", "EMAIL", "IN_APP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNEL)[number];

export const NOTIFICATION_STATUS = ["PENDING", "SENT", "FAILED"] as const;
export type NotificationStatusT = (typeof NOTIFICATION_STATUS)[number];

export const OTP_PURPOSE = ["REGISTRATION", "LOGIN"] as const;
export type OtpPurpose = (typeof OTP_PURPOSE)[number];

export const FRAUD_SEVERITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type FraudSeverity = (typeof FRAUD_SEVERITY)[number];

export const ACTOR_TYPE = ["ADMIN", "SYSTEM", "USER"] as const;
export type ActorType = (typeof ACTOR_TYPE)[number];

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;
export type Emirate = (typeof UAE_EMIRATES)[number];

export const FRAUD_RULES = [
  "DUPLICATE_RECEIPT_NUMBER",
  "DUPLICATE_IMAGE_HASH",
  "DUPLICATE_USER_SUBMISSION",
  "DUPLICATE_PHONE",
  "DUPLICATE_EMAIL",
  "SUBMISSION_LIMIT_EXCEEDED",
  "RATE_LIMIT_EXCEEDED",
  "LOW_OCR_CONFIDENCE",
  "RECEIPT_DATE_INVALID",
  "RECEIPT_DATE_OUTSIDE_CAMPAIGN",
  "MIN_PURCHASE_NOT_MET",
  "NO_HAYATNA_PRODUCT",
  "BLACKLISTED_USER",
  "UNREADABLE_IMAGE",
  "SUSPECTED_EDITED_IMAGE",
  "RECEIPT_NUMBER_MISSING",
] as const;
export type FraudRule = (typeof FRAUD_RULES)[number];
