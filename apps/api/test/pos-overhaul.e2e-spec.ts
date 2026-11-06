import "dotenv/config";
import { afterAll, beforeAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
let agent: request.Agent;
let tenantId: string;
let customerId: string;
let productId: string;
const stamp = Date.now();

beforeAll(async () => {
  app = await createTestApp();
  agent = request.agent(app.getHttpServer());
  const reg = await agent
    .post("/api/v1/auth/register")
    .send({ email: `pos-${stamp}@toko.local`, password: "rahasia123", name: "P", storeName: "Toko POS" })
    .expect(201);
  tenantId = reg.body.tenants[0].id;
});

afterAll(async () => {
  await app?.close();
});

test("produk tanpa SKU mendapat kode otomatis dan kategori bisa dibaca", async () => {
  const created = await agent
    .post("/api/v1/products")
    .set("X-Tenant-Id", tenantId)
    .send({ name: "Kopi Susu", category: "Makanan", price: 18000 })
    .expect(201);

  productId = created.body.id;
  expect(created.body.sku).toMatch(/^PRD-/);

  const categories = await agent.get("/api/v1/products/categories").set("X-Tenant-Id", tenantId).expect(200);
  expect(categories.body.items).toContain("Makanan");
});

test("pelanggan tanpa referensi dan tanpa telepon tetap tersimpan", async () => {
  const created = await agent
    .post("/api/v1/customers")
    .set("X-Tenant-Id", tenantId)
    .send({ name: "Budi" })
    .expect(201);

  customerId = created.body.id;
  expect(created.body.externalRef).toMatch(/^CUS-/);
  expect(created.body.phone).toBeNull();
});

test("penjualan membuat pelanggan dan produk baru dalam satu request", async () => {
  const res = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .send({
      occurredAt: "2026-11-06T03:00:00.000Z",
      newCustomer: { name: "Sari" },
      items: [
        { newProduct: { name: "Teh Manis", category: "Minuman", price: 8000 }, qty: 2, unitPrice: 8000 },
      ],
    })
    .expect(201);

  expect(res.body.sale.code).toMatch(/^INV-/);
  expect(res.body.sale.customerName).toBe("Sari");
  expect(res.body.sale.items[0].productId).toBeTruthy();
});

test("edit penjualan mempertahankan productId", async () => {
  const created = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .send({
      occurredAt: "2026-11-06T04:00:00.000Z",
      customerId,
      items: [{ productId, description: "Kopi Susu", qty: 1, unitPrice: 18000 }],
    })
    .expect(201);

  const saleId = created.body.sale.id;
  const updated = await agent
    .put(`/api/v1/sales/${saleId}`)
    .set("X-Tenant-Id", tenantId)
    .send({
      occurredAt: "2026-11-06T04:30:00.000Z",
      customerId,
      items: [{ productId, description: "Kopi Susu", qty: 3, unitPrice: 18000 }],
    })
    .expect(200);

  expect(updated.body.items[0].productId).toBe(productId);
  expect(updated.body.total).toBe("54000.00");

  const other = await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send({ email: `pos-other-${stamp}@toko.local`, password: "rahasia123", name: "O", storeName: "Toko Lain" })
    .expect(201);
  const otherTenant = other.body.tenants[0].id;
  await request(app.getHttpServer())
    .put(`/api/v1/sales/${saleId}`)
    .set("X-Tenant-Id", otherTenant)
    .set("Cookie", other.headers["set-cookie"])
    .send({ occurredAt: "2026-11-06T04:30:00.000Z", items: [{ description: "X", qty: 1, unitPrice: 1 }] })
    .expect(404);
});

test("hapus penjualan berarti void, bukan hilang dari riwayat", async () => {
  const created = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .send({ occurredAt: "2026-11-06T05:00:00.000Z", items: [{ description: "Item", qty: 1, unitPrice: 5000 }] })
    .expect(201);
  const saleId = created.body.sale.id;

  await agent.delete(`/api/v1/sales/${saleId}`).set("X-Tenant-Id", tenantId).expect(200);

  const live = await agent.get("/api/v1/sales").set("X-Tenant-Id", tenantId).expect(200);
  expect(live.body.sales.some((sale: { id: string }) => sale.id === saleId)).toBe(false);

  const all = await agent.get("/api/v1/sales?status=void").set("X-Tenant-Id", tenantId).expect(200);
  const voided = all.body.sales.find((sale: { id: string }) => sale.id === saleId);
  expect(voided?.status).toBe("void");
});

test("tabel gabungan mengembalikan baris item dengan produk dan pelanggan", async () => {
  const res = await agent.get("/api/v1/sales/lines?limit=50").set("X-Tenant-Id", tenantId).expect(200);

  const row = res.body.items.find((item: { productId: string | null }) => item.productId === productId);
  expect(row).toBeTruthy();
  expect(row.productName).toBe("Kopi Susu");
  expect(row.category).toBe("Makanan");
  expect(row.saleCode).toMatch(/^INV-/);
  expect(row.customerName).toBe("Budi");
});
