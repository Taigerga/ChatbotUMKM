import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/http-exception.filter";
import { AiProviderService } from "../src/modules/ai-provider/ai-provider.service";

let app: INestApplication;
let agent: request.Agent;
let tenantId: string;
const stamp = Date.now();

const mockProvider = {
  complete: async () => ({
    provider: "mock",
    toolCalls: [
      {
        id: "call-1",
        name: "createSale",
        arguments: { occurredAt: "2026-10-27T04:00:00.000Z", items: [{ description: "Paket", qty: 1, unitPrice: 1250000 }] },
      },
    ],
  }),
};

async function propose(agentRef: request.Agent, tenant: string) {
  const res = await agentRef
    .post("/api/v1/chat/messages")
    .set("X-Tenant-Id", tenant)
    .send({ message: "Catat penjualan Rp1.250.000" })
    .expect(201);
  return res.body.action.id as string;
}

afterAll(async () => {
  await app?.close();
});

test("confirm menulis satu sale, konfirmasi ulang idempoten", async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiProviderService)
    .useValue(mockProvider)
    .compile();
  app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  agent = request.agent(app.getHttpServer());
  const reg = await agent
    .post("/api/v1/auth/register")
    .send({ email: `confirm-${stamp}@toko.local`, password: "rahasia123", name: "K", storeName: "Toko Konfirmasi" })
    .expect(201);
  tenantId = reg.body.tenants[0].id;

  const actionId = await propose(agent, tenantId);
  const first = await agent.post(`/api/v1/chat/actions/${actionId}/confirm`).set("X-Tenant-Id", tenantId).expect(201);
  expect(first.body.status).toBe("executed");
  expect(first.body.result.total).toBe("1250000.00");

  const second = await agent.post(`/api/v1/chat/actions/${actionId}/confirm`).set("X-Tenant-Id", tenantId).expect(201);
  expect(second.body.result.saleId).toBe(first.body.result.saleId);

  const sales = await agent.get("/api/v1/sales").set("X-Tenant-Id", tenantId).expect(200);
  expect(sales.body.total).toBe(1);
});

test("aksi tenant lain 404 dan aksi dibatalkan tidak bisa dikonfirmasi", async () => {
  const other = request.agent(app.getHttpServer());
  const reg = await other
    .post("/api/v1/auth/register")
    .send({ email: `confirm-b-${stamp}@toko.local`, password: "rahasia123", name: "B", storeName: "Toko B" })
    .expect(201);
  const otherTenant = reg.body.tenants[0].id;

  const actionId = await propose(agent, tenantId);
  await other.post(`/api/v1/chat/actions/${actionId}/confirm`).set("X-Tenant-Id", otherTenant).expect(404);

  const cancelId = await propose(agent, tenantId);
  await agent.post(`/api/v1/chat/actions/${cancelId}/cancel`).set("X-Tenant-Id", tenantId).expect(201);
  const res = await agent.post(`/api/v1/chat/actions/${cancelId}/confirm`).set("X-Tenant-Id", tenantId).expect(409);
  expect(res.body.code).toBe("ACTION_CANCELLED");
});
