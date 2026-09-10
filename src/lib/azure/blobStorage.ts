import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from "@azure/storage-blob";
import { promises as fs } from "fs";
import path from "path";
import { config, isMockBlobStorage } from "@/lib/config";
import { logger } from "@/lib/logger";

export interface UploadedReceiptBlob {
  /** Fully-qualified URL the app should persist and later resolve for display. */
  url: string;
  /** Storage-relative blob name / local mock path, used for deletion or SAS regeneration. */
  blobName: string;
}

const LOCAL_MOCK_DIR = path.join(process.cwd(), "local-uploads", "receipts");

let containerClientPromise: Promise<ContainerClient> | null = null;

function getContainerClient(): Promise<ContainerClient> {
  if (containerClientPromise) return containerClientPromise;

  containerClientPromise = (async () => {
    const serviceClient = BlobServiceClient.fromConnectionString(
      config.AZURE_STORAGE_CONNECTION_STRING,
    );
    const container = serviceClient.getContainerClient(config.AZURE_STORAGE_CONTAINER_RECEIPTS);
    await container.createIfNotExists(); // private container — no `access` option => no public read
    return container;
  })();

  return containerClientPromise;
}

/**
 * Uploads a receipt image/PDF. In mock mode (no Azure credentials configured)
 * the file is written to a local folder and served via the
 * /api/mock-blob/[...path] route so the rest of the app (admin dashboard,
 * receipt preview) works identically in both modes.
 */
export async function uploadReceiptBlob(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  ownerUserId: string,
): Promise<UploadedReceiptBlob> {
  const safeName = `${ownerUserId}/${Date.now()}-${sanitizeFilename(originalFilename)}`;

  if (isMockBlobStorage) {
    const fullPath = path.join(LOCAL_MOCK_DIR, safeName);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    logger.info("Receipt stored via mock local blob backend", { safeName });
    return { url: `/api/mock-blob/${safeName}`, blobName: safeName };
  }

  const container = await getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(safeName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return { url: blockBlobClient.url, blobName: safeName };
}

/** Generates a short-lived read SAS URL for private receipt blobs (admin preview). */
export async function generateReceiptReadUrl(blobName: string): Promise<string> {
  if (isMockBlobStorage) {
    return `/api/mock-blob/${blobName}`;
  }

  const container = await getContainerClient();
  const blobClient = container.getBlobClient(blobName);

  const match = config.AZURE_STORAGE_CONNECTION_STRING.match(
    /AccountName=([^;]+);AccountKey=([^;]+)/,
  );
  if (!match) return blobClient.url;

  const credential = new StorageSharedKeyCredential(match[1]!, match[2]!);
  const expiresOn = new Date(Date.now() + config.AZURE_STORAGE_SAS_TTL_MIN * 60_000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.AZURE_STORAGE_CONTAINER_RECEIPTS,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential,
  ).toString();

  return `${blobClient.url}?${sas}`;
}

export async function readLocalMockBlob(relativePath: string): Promise<Buffer | null> {
  const fullPath = path.join(LOCAL_MOCK_DIR, relativePath);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(LOCAL_MOCK_DIR))) return null; // path traversal guard
  try {
    return await fs.readFile(resolved);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}
