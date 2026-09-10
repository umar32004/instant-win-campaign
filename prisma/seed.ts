import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function winnerCode(): string {
  return `HYW-${randomUUID().split("-")[0]!.toUpperCase()}`;
}

function redemptionCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

async function main() {
  console.log("Seeding Hayatna Instant Win campaign data...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@hayatna.ae";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Campaign Super Admin",
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const now = new Date();
  // TEMPORARY (testing): wide-open date range so real receipts of any age
  // pass the campaign-date check while testing OCR/eligibility. Before a
  // real launch, set startDate/endDate back to the actual campaign window
  // (e.g. `startDate = now`, `endDate = now + 3 months`).
  const startDate = new Date("2020-01-01");
  const endDate = new Date("2030-12-31");

  const campaign = await prisma.campaign.upsert({
    where: { slug: "hayatna-instant-win-2026" },
    update: {},
    create: {
      name: "Instant Win Campaign",
      slug: "hayatna-instant-win-2026",
      description:
        "Buy a qualifying product from a participating UAE supermarket, scan the QR code, upload your receipt, and spin the wheel for an instant prize.",
      status: "ACTIVE",
      startDate,
      endDate,
      minPurchaseAmountAed: 0,
      receiptConfidenceThreshold: 0.6,
      maxSubmissionsPerUserPerDay: 3,
      fuzzyMatchThreshold: 0.72,
      termsUrl: "/terms",
    },
  });

  const prizeSeed = [
    { name: "Free Product Sample", tier: "STANDARD", weight: 40, stock: 5000, daily: 200 },
    { name: "10% Discount Coupon", tier: "STANDARD", weight: 30, stock: 8000, daily: 400 },
    { name: "AED 25 Gift Voucher", tier: "STANDARD", weight: 15, stock: 2000, daily: 80 },
    { name: "Premium Gift Basket", tier: "PREMIUM", weight: 10, stock: 500, daily: 20 },
    { name: "Premium Hamper", tier: "PREMIUM", weight: 4, stock: 150, daily: 5 },
    { name: "Grand Prize — AED 5,000", tier: "GRAND", weight: 1, stock: 5, daily: 1 },
  ];

  for (const [index, p] of prizeSeed.entries()) {
    const existing = await prisma.prize.findFirst({
      where: { campaignId: campaign.id, name: p.name },
    });
    const prize =
      existing ??
      (await prisma.prize.create({
        data: {
          campaignId: campaign.id,
          name: p.name,
          tier: p.tier,
          probabilityWeight: p.weight,
          sortOrder: index,
        },
      }));

    await prisma.prizeInventory.upsert({
      where: { prizeId: prize.id },
      update: {},
      create: {
        prizeId: prize.id,
        totalStock: p.stock,
        remainingStock: p.stock,
        dailyLimit: p.daily,
        weeklyLimit: p.daily * 7,
        campaignLimit: p.stock,
      },
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: "campaign.active_slug" },
    update: { value: campaign.slug },
    create: {
      key: "campaign.active_slug",
      value: campaign.slug,
      description: "Slug of the currently active public campaign",
    },
  });

  // A couple of demo users + a winning journey, useful for admin dashboard demo
  const demoUser = await prisma.user.upsert({
    where: { email: "demo.participant@example.com" },
    update: {},
    create: {
      fullName: "Fatima Al Mazrouei",
      mobileNumber: "+971501234567",
      email: "demo.participant@example.com",
      emirate: "Dubai",
      ageConfirmed: true,
      termsAcceptedAt: now,
    },
  });

  const demoReceipt = await prisma.receipt.upsert({
    where: { id: "seed-demo-receipt" },
    update: {},
    create: {
      id: "seed-demo-receipt",
      userId: demoUser.id,
      campaignId: campaign.id,
      storeNameRaw: "LULU HYPERMARKET LLC",
      storeNameNormalized: "lulu hypermarket",
      receiptNumber: "INV-000482913",
      transactionDate: now,
      currency: "AED",
      totalAmount: 42.5,
      subtotal: 40.48,
      taxAmount: 2.02,
      imageUrl: "local-mock://seed/receipt.jpg",
      imageSha256: "seed0000000000000000000000000000000000000000000000000000000000",
      ocrConfidence: 0.97,
      hayatnaProductDetected: true,
      hayatnaConfidence: 0.95,
      status: "APPROVED",
      verifiedAt: now,
      items: {
        create: [
          {
            rawText: "SAMPLE PRODUCT 1L",
            normalizedName: "sample product 1l",
            matchedSku: "SAMPLE_PRODUCT_1L",
            isHayatnaProduct: true,
            matchConfidence: 0.98,
            quantity: 2,
            unitPrice: 6.5,
            lineTotal: 13.0,
          },
          {
            rawText: "AL AIN WATER 12X500ML",
            normalizedName: "al ain water 12x500ml",
            isHayatnaProduct: false,
            quantity: 1,
            unitPrice: 10.0,
            lineTotal: 10.0,
          },
        ],
      },
    },
  });

  const firstPrize = await prisma.prize.findFirst({ where: { campaignId: campaign.id } });
  if (firstPrize) {
    await prisma.winner.upsert({
      where: { receiptId: demoReceipt.id },
      update: {},
      create: {
        winnerCode: winnerCode(),
        userId: demoUser.id,
        receiptId: demoReceipt.id,
        prizeId: firstPrize.id,
        campaignId: campaign.id,
        storeName: "Lulu Hypermarket",
        status: "PENDING_REDEMPTION",
        redemptionCode: redemptionCode(),
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail} / (see SEED_ADMIN_PASSWORD in your .env)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
