import { z } from "zod";
import { UAE_EMIRATES } from "@/types/enums";

// UAE mobile numbers: 05XXXXXXXX, +9715XXXXXXXX, 9715XXXXXXXX (9,10 or 12-13 digits)
const uaeMobileRegex = /^(?:\+?971|0)?5[0245689]\d{7}$/;

export function normalizeUaeMobile(input: string): string {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.replace(/^971/, "").replace(/^0/, "");
  return `+971${local}`;
}

export const registrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z؀-ۿ\s'.-]+$/, "Full name contains invalid characters"),
  mobileNumber: z
    .string()
    .trim()
    .regex(uaeMobileRegex, "Enter a valid UAE mobile number, e.g. 050 123 4567"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(150),
  emirate: z.enum(UAE_EMIRATES, { errorMap: () => ({ message: "Select a valid Emirate" }) }),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are 18 years or older" }),
  }),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
  // Honeypot field — must stay empty. Bots that autofill every field trip this.
  website: z.string().max(0).optional().default(""),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const uploadReceiptSchema = z.object({
  userId: z.string().cuid(),
  campaignSlug: z.string().min(1),
});

export const verifyReceiptSchema = z.object({
  receiptId: z.string().cuid(),
});

export const spinRequestSchema = z.object({
  receiptId: z.string().cuid(),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export const adminSettingsUpdateSchema = z.object({
  minPurchaseAmountAed: z.number().min(0).optional(),
  receiptConfidenceThreshold: z.number().min(0).max(1).optional(),
  maxSubmissionsPerUserPerDay: z.number().int().min(1).max(50).optional(),
  fuzzyMatchThreshold: z.number().min(0).max(1).optional(),
});

export const blacklistUserSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(3).max(500),
});

export const blacklistReceiptSchema = z.object({
  receiptId: z.string().cuid(),
  reason: z.string().min(3).max(500),
});

export const manualOverrideReceiptSchema = z.object({
  receiptId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().min(3).max(500).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(""),
});

export const ACCEPTED_RECEIPT_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
