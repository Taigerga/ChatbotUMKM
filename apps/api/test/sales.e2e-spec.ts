import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
let agent: request.Agent;
let tenantId: string;
const stamp = Date.now();

afterAll(async () => {
  await app?.close();
});

function saleBody(occurredAt = "2026-10-27T04:00:00.000Z") {
  return {
    occurredAt,
    items: [
      { description: "Kopi", qty: 2, unitPrice: 250000 },
      { description: "Teh", qty: 1, unitPrice: 750000 },
    ],
  };
}

test("POST /sales menghitung total di server", async () => {
  app = await createTestApp();
  agent = request.agent(app.getHttpServer());
  const reg = await agent
    .post("/api/v1/auth/register")
    .send({ email: `sales-${stamp}@toko.local`, password: "rahasia123", name: "S", storeName: "Toko Sales" })
    .expect(201);
  tenantId = reg.body.tenants[0].id;

  const res = await agent.post("/api/v1/sales").set("X-Tenant-Id", tenantId).send(saleBody()).expect(201);
  expect(res.body.sale.subtotal).toBe("1250000.00");
  expect(res.body.sale.total).toBe("1250000.00");
  expect(res.body.sale.items).toHaveLength(2);
});

test("Idempotency-Key sama tidak menggandakan sale", async () => {
  const first = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .set("Idempotency-Key", "kunci-1")
    .send(saleBody())
    .expect(201);
  const second = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .set("Idempotency-Key", "kunci-1")
    .send(saleBody())
    .expect(201);

  expect(second.body.sale.id).toBe(first.body.sale.id);
  const list = await agent.get("/api/v1/sales").set("X-Tenant-Id", tenantId).expect(200);
  expect(list.body.total).toBe(2);
});

test("item tanpa deskripsi ditolak 400", async () => {
  const res = await agent
    .post("/api/v1/sales")
    .set("X-Tenant-Id", tenantId)
    .send({ occurredAt: "2026-10-27T04:00:00.000Z", items: [{ qty: 1, unitPrice: 1000 }] })
    .expect(400);
  expect(res.body.code).toBe("BAD_REQUEST");
});
