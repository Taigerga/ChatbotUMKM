import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "../prisma/seed";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("seed idempotent: dijalankan dua kali tidak menggandakan data", async () => {
  await seed(prisma);
  await seed(prisma);

  const user = await prisma.user.count({ where: { email: "demo@toko.local" } });
  expect(user).toBe(1);

  const demo = await prisma.tenant.findFirstOrThrow({ where: { isDemo: true } });
  expect(await prisma.sale.count({ where: { tenantId: demo.id } })).toBe(5);

  const sales = await prisma.sale.findMany({ where: { tenantId: demo.id } });
  const total = sales.reduce((sum, s) => sum + Number(s.total), 0);
  expect(total).toBe(1_250_000);

  const demoUser = await prisma.user.findFirstOrThrow({ where: { email: "demo@toko.local" } });
  expect(await prisma.tenantMember.count({ where: { userId: demoUser.id } })).toBe(1);
});
