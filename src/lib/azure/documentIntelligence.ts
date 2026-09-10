import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import sharp from "sharp";
import { createHash } from "crypto";
import { config, isMockOcr } from "@/lib/config";
import { logger } from "@/lib/logger";

// Azure Document Intelligence hard-rejects oversized uploads
// ("InvalidContentLength") — the Free (F0) tier caps this around 4 MB, and
// real phone camera photos routinely come in well above that. Compressing
// server-side (rather than trusting customers to resize their own photos)
// is the only reliable fix. The ORIGINAL, uncompressed file is still what
// gets stored in blob storage — only the copy sent to OCR is shrunk.
const MAX_OCR_BYTES = 3.5 * 1024 * 1024; // safety margin under Azure's ~4 MB cap
const MAX_OCR_DIMENSION_PX = 2500;

async function compressForOcr(buffer: Buffer, contentType: string): Promise<Buffer> {
  if (contentType === "application/pdf") return buffer; // sharp only handles raster images
  if (buffer.length <= MAX_OCR_BYTES) return buffer;

  let quality = 85;
  let output = buffer;

  while (quality >= 30) {
    output = await sharp(buffer)
      .resize({ width: MAX_OCR_DIMENSION_PX, height: MAX_OCR_DIMENSION_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    if (output.length <= MAX_OCR_BYTES) break;
    quality -= 15;
  }

  logger.info("Compressed receipt image for OCR", {
    originalBytes: buffer.length,
    compressedBytes: output.length,
    finalQuality: quality,
  });

  return output;
}

export interface OcrReceiptItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
}

export interface ReceiptOcrResult {
  merchantName: string | null;
  receiptNumber: string | null;
  transactionDate: Date | null;
  currency: string | null;
  totalAmount: number | null;
  subtotal: number | null;
  taxAmount: number | null;
  items: OcrReceiptItem[];
  /** Overall document-level confidence score from the model, 0..1. */
  confidence: number;
  /** Concatenated raw OCR text, used as a fallback for fuzzy product matching
   * when structured line items aren't well segmented. */
  rawText: string;
}

/**
 * Azure SDK `RestError`s stringify down to a generic one-liner ("Invalid
 * request."), hiding the actually useful diagnostic info (status code, error
 * code, and the service's response body). Log those explicitly so real
 * failures are debuggable from server logs instead of guessing.
 */
function logDetailedAzureError(err: unknown): void {
  const e = err as {
    message?: string;
    statusCode?: number;
    code?: string;
    details?: unknown;
    response?: { status?: number; bodyAsText?: string };
  };
  logger.error("Azure Document Intelligence request failed", {
    message: e?.message,
    statusCode: e?.statusCode ?? e?.response?.status,
    code: e?.code,
    details: e?.details,
    responseBody: e?.response?.bodyAsText,
  });
}

let client: DocumentAnalysisClient | null = null;

function getClient(): DocumentAnalysisClient {
  if (client) return client;
  client = new DocumentAnalysisClient(
    config.AZURE_DOCINTEL_ENDPOINT,
    new AzureKeyCredential(config.AZURE_DOCINTEL_KEY),
  );
  return client;
}

/**
 * Analyzes a receipt image/PDF using Azure AI Document Intelligence's
 * prebuilt-receipt model. In mock mode (no Azure credentials configured),
 * returns a deterministic synthetic result derived from the file's content
 * hash so local development and automated tests can exercise the full
 * eligibility/fraud pipeline without any cloud dependency.
 */
export async function analyzeReceipt(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
): Promise<ReceiptOcrResult> {
  if (isMockOcr) {
    return mockAnalyzeReceipt(buffer, originalFilename);
  }

  const ocrBuffer = await compressForOcr(buffer, contentType);

  let poller;
  try {
    // This SDK version has no usable `contentType` option — `toAnalyzeRequest`
    // always sends "application/octet-stream" for a raw body input — and a
    // Node global `Blob` isn't a recognized request-body type here (throws
    // "Unrecognized body type" before any network call). A plain Buffer is
    // the type this SDK's body serialization actually supports.
    poller = await getClient().beginAnalyzeDocument(config.AZURE_DOCINTEL_MODEL_ID, ocrBuffer);
  } catch (err) {
    logDetailedAzureError(err);
    throw err;
  }

  let result;
  try {
    result = await poller.pollUntilDone();
  } catch (err) {
    logDetailedAzureError(err);
    throw err;
  }

  const doc = result.documents?.[0];
  if (!doc) {
    logger.warn("Document Intelligence returned no documents", {});
    return {
      merchantName: null,
      receiptNumber: null,
      transactionDate: null,
      currency: null,
      totalAmount: null,
      subtotal: null,
      taxAmount: null,
      items: [],
      confidence: 0,
      rawText: result.content ?? "",
    };
  }

  const fields = doc.fields ?? {};
  const itemsField = rawFieldValue(fields.Items);
  const items: OcrReceiptItem[] = (Array.isArray(itemsField) ? itemsField : []).map((raw) => {
    const itemFields = (rawFieldValue(raw) as Record<string, unknown>) ?? {};
    return {
      description: String(rawFieldValue(itemFields.Description) ?? ""),
      quantity: numberOrNull(rawFieldValue(itemFields.Quantity)),
      unitPrice: numberOrNull(rawFieldValue(itemFields.Price)),
      totalPrice: numberOrNull(rawFieldValue(itemFields.TotalPrice)),
    };
  });

  const totalValue = rawFieldValue(fields.Total);
  const rawText = result.content ?? "";

  // Some store receipts (seen on real Carrefour UAE receipts) print no
  // plain-text "invoice number" at all — only a barcode, with its digits
  // printed underneath as OCR-readable text. When the model's structured
  // ReceiptNumber field comes back empty, fall back to the longest run of
  // 10+ digits anywhere on the receipt (barcode numbers are always long and
  // distinctive) so duplicate-submission detection still has something to
  // key off of.
  const structuredReceiptNumber =
    stringOrNull(rawFieldValue(fields.ReceiptNumber)) ?? stringOrNull(rawFieldValue(fields.TransactionId));
  const barcodeFallback = extractLongestDigitRun(rawText, 10);

  return {
    merchantName: stringOrNull(rawFieldValue(fields.MerchantName)),
    receiptNumber: structuredReceiptNumber ?? barcodeFallback,
    transactionDate: dateOrNull(rawFieldValue(fields.TransactionDate)),
    currency: stringOrNull((totalValue as { currencySymbol?: string } | null)?.currencySymbol) ?? "AED",
    totalAmount: numberOrNull(totalValue),
    subtotal: numberOrNull(rawFieldValue(fields.Subtotal)),
    taxAmount: numberOrNull(rawFieldValue(fields.TotalTax)),
    items,
    confidence: doc.confidence ?? 0,
    rawText,
  };
}

/**
 * Finds the longest run of `minLength`+ consecutive digits anywhere in the
 * text — used as a stand-in receipt identifier when a receipt prints its
 * invoice number only as a barcode (with the digits as plain text below it)
 * rather than a labeled "Receipt #" field the model can extract directly.
 */
function extractLongestDigitRun(text: string, minLength: number): string | null {
  const matches = text.match(/\d+/g) ?? [];
  const candidates = matches.filter((m) => m.length >= minLength);
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, current) => (current.length > longest.length ? current : longest));
}

/**
 * Azure's DocumentField is a discriminated union (kind: "string" | "number" |
 * "date" | "currency" | "array" | "object" | ...) where the payload lives
 * under different property names per kind. This extracts whichever payload
 * is present without the caller needing to narrow the union manually.
 */
function rawFieldValue(field: unknown): unknown {
  if (!field || typeof field !== "object") return null;
  const f = field as { kind?: string; value?: unknown; values?: unknown; properties?: unknown; content?: unknown };
  switch (f.kind) {
    case "array":
      return f.values ?? null;
    case "object":
      return f.properties ?? null;
    default:
      return f.value ?? f.content ?? null;
  }
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "amount" in (value as Record<string, unknown>)) {
    const amount = (value as { amount?: number }).amount;
    return typeof amount === "number" ? amount : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function dateOrNull(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mock provider — deterministic per file hash, no external calls.
// ---------------------------------------------------------------------------

const MOCK_STORES = ["Lulu Hypermarket", "Carrefour UAE", "Union Coop", "Nesto Hypermarket", "Choithrams", "Spinneys", "Viva"];
const HAYATNA_PRODUCTS = [
  "HAYATNA FRESH MILK 1L",
  "HAYATNA LABAN 1L",
  "HAYATNA YOGURT 170G",
  "HAYATNA JUICE ORANGE 1L",
  "HAYATNA CHEESE SLICES 200G",
];
const OTHER_PRODUCTS = [
  "AL AIN WATER 12X500ML",
  "NATIONAL BREAD WHITE",
  "LIPTON TEA 100 BAGS",
  "INDOMIE NOODLES CHICKEN",
  "NESTLE PURE LIFE 1.5L",
  "KRAFT CHEDDAR CHEESE",
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mockAnalyzeReceipt(buffer: Buffer, originalFilename: string): ReceiptOcrResult {
  const hash = createHash("sha256").update(buffer).digest();
  const seed = hash.readUInt32BE(0);
  const rand = mulberry32(seed);

  const filenameHintsHayatna = /hayatna|hytna|haytna|hyatna/i.test(originalFilename);
  const store = MOCK_STORES[Math.floor(rand() * MOCK_STORES.length)]!;

  // 70% of mock receipts contain a Hayatna product (or always, if the test
  // filename hints at it), so both the "eligible" and "not eligible" UX paths
  // are easy to demo locally.
  const includesHayatna = filenameHintsHayatna || rand() < 0.7;

  const items: OcrReceiptItem[] = [];
  if (includesHayatna) {
    const product = HAYATNA_PRODUCTS[Math.floor(rand() * HAYATNA_PRODUCTS.length)]!;
    const qty = 1 + Math.floor(rand() * 3);
    const unitPrice = Math.round((5 + rand() * 10) * 100) / 100;
    items.push({ description: product, quantity: qty, unitPrice, totalPrice: Math.round(qty * unitPrice * 100) / 100 });
  }
  const extraCount = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < extraCount; i++) {
    const product = OTHER_PRODUCTS[Math.floor(rand() * OTHER_PRODUCTS.length)]!;
    const qty = 1 + Math.floor(rand() * 2);
    const unitPrice = Math.round((3 + rand() * 15) * 100) / 100;
    items.push({ description: product, quantity: qty, unitPrice, totalPrice: Math.round(qty * unitPrice * 100) / 100 });
  }

  const subtotal = Math.round(items.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const receiptNumber = `INV-${(seed % 900000000) + 100000000}`;
  const confidence = 0.82 + rand() * 0.17;

  return {
    merchantName: store,
    receiptNumber,
    transactionDate: new Date(),
    currency: "AED",
    totalAmount,
    subtotal,
    taxAmount,
    items,
    confidence: Math.round(confidence * 100) / 100,
    rawText: items.map((i) => i.description).join("\n"),
  };
}
