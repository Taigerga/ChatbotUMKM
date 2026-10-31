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
import type { CompletionResult } from "../src/modules/ai-provider/provider.interface";

let app: INestApplication;
let agent: request.Agent;
let tenantId: string;
const stamp = Date.now();

const proposal: CompletionResult = {
  provider: "mock",
  toolCalls: [
    {
      id: "call-1",
      name: "createSale",
      arguments: {
        occurredAt: "2026-10-27T04:00:00.000Z",
        items: [{ description: "Paket grosir", qty: 1, unitPrice: 1250000 }],
      },
    },
  ],
};

const mockProvider = {
  complete: async (request: { tools: { name: string }[] }) => {
    const isWriteRequest = request.tools.some((tool) => tool.name === "createSale");
    if (!isWriteRequest) return { provider: "mock", text: "Model belum siap", toolCalls: [] };
    return proposal;
  },
};

async function buildApp(providerOverride: unknown) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiProviderService)
    .useValue(providerOverride)
    .compile();
  const instance = moduleRef.createNestApplication({ logger: false });
  instance.setGlobalPrefix("api/v1");
  instance.use(cookieParser());
  instance.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  instance.useGlobalFilters(new HttpExceptionFilter());
  await instance.init();
  return instance;
}

afterAll(async () => {
  await app?.close();
});

test("pesan penjualan menghasilkan usulan aksi tanpa menulis DB", async () => {
  app = await buildApp(mockProvider);
  agent = request.agent(app.getHttpServer());
  const reg = await agent
    .post("/api/v1/auth/register")
    .send({ email: `chat-${stamp}@toko.local`, password: "rahasia123", name: "C", storeName: "Toko Chat" })
    .expect(201);
  tenantId = reg.body.tenants[0].id;

  const res = await agent
    .post("/api/v1/chat/messages")
    .set("X-Tenant-Id", tenantId)
    .send({ message: "Catat penjualan 27 Oktober 2026 sebesar Rp1.250.000 dari 18 item" })
    .expect(201);

  expect(res.body.action.tool).toBe("createSale");
  expect(res.body.action.id).toBeTruthy();
  expect(res.body.action.preview.total).toBe("1250000.00");
  expect(res.body.conversationId).toBeTruthy();

  const sales = await agent.get("/api/v1/sales").set("X-Tenant-Id", tenantId).expect(200);
  expect(sales.body.total).toBe(0);
});

test("pesan tanpa tool call hanya membalas teks", async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiProviderService)
    .useValue({ complete: async () => ({ provider: "mock", text: "Halo, ada yang bisa dibantu?", toolCalls: [] }) })
    .compile();
  const plain = moduleRef.createNestApplication({ logger: false });
  plain.setGlobalPrefix("api/v1");
  plain.use(cookieParser());
  plain.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  plain.useGlobalFilters(new HttpExceptionFilter());
  await plain.init();

  const agent2 = request.agent(plain.getHttpServer());
  await agent2.post("/api/v1/auth/login").send({ email: `chat-${stamp}@toko.local`, password: "rahasia123" }).expect(200);

  const res = await agent2
    .post("/api/v1/chat/messages")
    .set("X-Tenant-Id", tenantId)
    .send({ message: "Halo" })
    .expect(201);

  expect(res.body.action).toBeUndefined();
  expect(res.body.reply).toContain("Halo");
  await plain.close();
});
