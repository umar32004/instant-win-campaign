/**
 * Centralized, typed environment configuration. Reading process.env directly
 * elsewhere in the codebase is discouraged — import `config` instead so
 * missing/invalid env vars fail fast and loudly in one place.
 */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Instant Win Campaign"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set to a strong secret"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set to a strong secret"),
  JWT_ACCESS_TTL_MIN: z.coerce.number().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),
  ADMIN_SESSION_COOKIE_NAME: z.string().default("hayatna_admin_session"),

  AZURE_STORAGE_CONNECTION_STRING: z.string().optional().default(""),
  AZURE_STORAGE_ACCOUNT_NAME: z.string().optional().default(""),
  AZURE_STORAGE_CONTAINER_RECEIPTS: z.string().default("receipts"),
  AZURE_STORAGE_SAS_TTL_MIN: z.coerce.number().default(15),

  AZURE_DOCINTEL_ENDPOINT: z.string().optional().default(""),
  AZURE_DOCINTEL_KEY: z.string().optional().default(""),
  AZURE_DOCINTEL_MODEL_ID: z.string().default("prebuilt-receipt"),

  USE_MOCK_CLOUD_SERVICES: z
    .string()
    .default("true")
    .transform((v) => v === "true"),

  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional().default(""),

  RATE_LIMIT_WINDOW_MIN: z.coerce.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(20),
  MAX_SUBMISSIONS_PER_USER_PER_DAY: z.coerce.number().default(3),
  MIN_RECEIPT_CONFIDENCE: z.coerce.number().default(0.6),
  MIN_PURCHASE_AMOUNT_AED: z.coerce.number().default(0),
  FUZZY_MATCH_THRESHOLD: z.coerce.number().default(0.72),

  REDIS_URL: z.string().optional().default(""),

  SMS_PROVIDER_API_KEY: z.string().optional().default(""),
  SMS_SENDER_ID: z.string().default("HAYATNA"),
});

// In test/build environments without a real .env, fall back to safe dev defaults
// for required secrets so `next build`/typecheck don't hard-fail in CI sandboxes
// that only lint/typecheck without ever booting the server.
const rawEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || "sqlserver://localhost:1433;database=dev;user=sa;password=devOnly!Passw0rd;trustServerCertificate=true",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "dev-only-access-secret-change-me-please-0000",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-only-refresh-secret-change-me-please-0000",
  // `||` (not zod's `.default()`) so a variable saved as an empty string in a
  // hosting dashboard — as opposed to genuinely unset — still falls back
  // instead of failing `.url()` validation on "".
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check .env against .env.example.");
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === "production";

// Each cloud integration falls back to its own mock independently — setting
// up Document Intelligence shouldn't force Blob Storage (or vice versa) into
// "real" mode before its own credentials are actually configured.
// USE_MOCK_CLOUD_SERVICES=true still force-mocks everything regardless of
// credentials (useful for CI/tests).
export const isMockOcr =
  config.USE_MOCK_CLOUD_SERVICES || !config.AZURE_DOCINTEL_ENDPOINT || !config.AZURE_DOCINTEL_KEY;

export const isMockBlobStorage =
  config.USE_MOCK_CLOUD_SERVICES || !config.AZURE_STORAGE_CONNECTION_STRING;

/** @deprecated use `isMockOcr` / `isMockBlobStorage` instead */
export const isMockCloudMode = isMockOcr && isMockBlobStorage;
