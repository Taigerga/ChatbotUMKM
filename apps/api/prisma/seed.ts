import "dotenv/config";
import { hash } from "argon2";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_USER_ID = "seed-user-demo";
const DEMO_TENANT_ID = "seed-tenant-demo";

export async function seed(prisma: PrismaClient) {
  const passwordHash = await hash("demo12345");
  await prisma.user.upsert({
    where: { email: "demo@toko.local" },
    update: {},
    create: { id: DEMO_USER_ID, email: "demo@toko.local", passwordHash, name: "Pemilik Demo" },
  });

  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: { id: DEMO_TENANT_ID, name: "Toko Demo", isDemo: true },
  });

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: DEMO_USER_ID, tenantId: DEMO_TENANT_ID } },
    update: {},
    create: { userId: DEMO_USER_ID, tenantId: DEMO_TENANT_ID },
  });

  const products = [
    { sku: "SKU-001", name: "Kopi Arabika 250g", category: "Minuman", price: "50000.00" },
    { sku: "SKU-002", name: "Teh Melati 100g", category: "Minuman", price: "35000.00" },
    { sku: "SKU-003", name: "Gula Aren 1kg", category: "Bahan", price: "25000.00" },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: DEMO_TENANT_ID, sku: p.sku } },
      update: {},
      create: { tenantId: DEMO_TENANT_ID, ...p },
    });
  }

  for (const c of [
    { externalRef: "CUST-001", name: "Bu Sari" },
    { externalRef: "CUST-002", name: "Pak Budi" },
  ]) {
    await prisma.customer.upsert({
      where: { tenantId_externalRef: { tenantId: DEMO_TENANT_ID, externalRef: c.externalRef } },
      update: {},
      create: { tenantId: DEMO_TENANT_ID, ...c },
    });
  }

  const dates = ["2026-09-27", "2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"];
  for (const [i, day] of dates.entries()) {
    const key = `seed-${i + 1}`;
    await prisma.sale.upsert({
      where: { tenantId_idempotencyKey: { tenantId: DEMO_TENANT_ID, idempotencyKey: key } },
      update: {},
      create: {
        tenantId: DEMO_TENANT_ID,
        occurredAt: new Date(`${day}T04:00:00.000Z`),
        subtotal: "250000.00",
        total: "250000.00",
        source: "seed",
        idempotencyKey: key,
        items: {
          create: [{ description: "Paket kopi", qty: 5, unitPrice: "50000.00", lineTotal: "250000.00" }],
        },
      },
    });
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed.ts")) {
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
  await seed(prisma);
  await prisma.$disconnect();
  console.log("seed selesai");
}
