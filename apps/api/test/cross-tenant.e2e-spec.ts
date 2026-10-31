import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
const stamp = Date.now();

async function register(suffix: string, storeName: string) {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post("/api/v1/auth/register").send({
    email: `cross-${suffix}-${stamp}@toko.local`,
    password: "rahasia123",
    name: suffix,
    storeName,
  }).expect(201);
  return { agent, tenantId: res.body.tenants[0].id };
}

afterAll(async () => {
  await app?.close();
});

test("isolasi produk, pelanggan, penjualan, dan overview antar tenant", async () => {
  app = await createTestApp();
  const a = await register("a", "Toko A");
  const b = await register("b", "Toko B");

  const product = await a.agent.post("/api/v1/products").set("X-Tenant-Id", a.tenantId)
    .send({ sku: "SKU-A", name: "Produk A", price: 10000 }).expect(201);
  const productId = product.body.id;

  const customer = await a.agent.post("/api/v1/customers").set("X-Tenant-Id", a.tenantId)
    .send({ externalRef: "CUST-A", name: "Pelanggan A" }).expect(201);
  const customerId = customer.body.id;

  const sale = await a.agent.post("/api/v1/sales").set("X-Tenant-Id", a.tenantId)
    .send({ occurredAt: "2026-10-27T04:00:00.000Z", customerId, items: [{ productId, description: "Produk A", qty: 1, unitPrice: 10000 }] }).expect(201);
  const saleId = sale.body.sale.id;

  // B cannot read A's entities
  await b.agent.get(`/api/v1/products/${productId}`).set("X-Tenant-Id", b.tenantId).expect(404);
  await b.agent.get(`/api/v1/customers/${customerId}`).set("X-Tenant-Id", b.tenantId).expect(404);
  await b.agent.get(`/api/v1/sales/${saleId}`).set("X-Tenant-Id", b.tenantId).expect(404);

  // B lists are empty
  const productsB = await b.agent.get("/api/v1/products").set("X-Tenant-Id", b.tenantId).expect(200);
  expect(productsB.body.total).toBe(0);
  const customersB = await b.agent.get("/api/v1/customers").set("X-Tenant-Id", b.tenantId).expect(200);
  expect(customersB.body.total).toBe(0);
  const salesB = await b.agent.get("/api/v1/sales").set("X-Tenant-Id", b.tenantId).expect(200);
  expect(salesB.body.total).toBe(0);

  // B cannot mutate A's entities
  await b.agent.put(`/api/v1/products/${productId}`).set("X-Tenant-Id", b.tenantId).send({ name: "X" }).expect(404);
  await b.agent.delete(`/api/v1/sales/${saleId}`).set("X-Tenant-Id", b.tenantId).expect(404);

  // overview isolated
  const overviewB = await b.agent.get("/api/v1/overview/summary").set("X-Tenant-Id", b.tenantId).expect(200);
  expect(overviewB.body.saleCount).toBe(0);
});
