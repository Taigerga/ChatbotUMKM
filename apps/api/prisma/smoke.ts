import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() AS db`;
console.log("connected", rows[0].db, "tenants", await prisma.tenant.count());
await prisma.$disconnect();
