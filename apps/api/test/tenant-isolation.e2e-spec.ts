import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
const stamp = Date.now();

async function registerUser(suffix: string, storeName: string): Promise<{ agent: request.Agent; tenantId: string }> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post("/api/v1/auth/register")
    .send({ email: `tenant-${suffix}-${stamp}@toko.local`, password: "rahasia123", name: suffix, storeName })
    .expect(201);
  return { agent, tenantId: res.body.tenants[0].id };
}

afterAll(async () => {
  await app?.close();
});

test("tanpa header tenant 400 TENANT_REQUIRED", async () => {
  app = await createTestApp();
  const { agent } = await registerUser("a", "Toko A");
  const res = await agent.get("/api/v1/tenants/active").expect(400);
  expect(res.body.code).toBe("TENANT_REQUIRED");
});

test("tenant milik user lain ditolak 403 TENANT_FORBIDDEN", async () => {
  const a = await registerUser("b", "Toko B");
  const b = await registerUser("c", "Toko C");
  const res = await a.agent.get("/api/v1/tenants/active").set("X-Tenant-Id", b.tenantId).expect(403);
  expect(res.body.code).toBe("TENANT_FORBIDDEN");
});

test("GET /tenants hanya berisi tenant sendiri", async () => {
  const a = await registerUser("d", "Toko D");
  await registerUser("e", "Toko E");
  const res = await a.agent.get("/api/v1/tenants").expect(200);
  expect(res.body.tenants).toHaveLength(1);
  expect(res.body.tenants[0].id).toBe(a.tenantId);

  const active = await a.agent.get("/api/v1/tenants/active").set("X-Tenant-Id", a.tenantId).expect(200);
  expect(active.body.tenant.id).toBe(a.tenantId);
  expect(active.body.tenant.name).toBe("Toko D");
});
