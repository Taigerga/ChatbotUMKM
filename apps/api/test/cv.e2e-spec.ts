import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
let agent: request.Agent;
let otherAgent: request.Agent;
let tenantId: string;
let userId: string;
let otherTenantId: string;
let productId: string;
let otherProductId: string;
let scanId: string;
let originalCvTimeout: string | undefined;

const stamp = Date.now();
const jpegBuffer = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmAA//9k=",
  "base64",
);

function stubFetch(payload: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 200, json: async () => payload } as Response);
}

async function register(suffix: string, storeName: string): Promise<{ agent: request.Agent; tenantId: string; userId: string }> {
  const userAgent = request.agent(app.getHttpServer());
  const res = await userAgent
    .post("/api/v1/auth/register")
    .send({ email: `cv-${suffix}-${stamp}@toko.local`, password: "rahasia123", name: suffix, storeName })
    .expect(201);
  return { agent: userAgent, tenantId: res.body.tenants[0].id, userId: res.body.user.id };
}

beforeAll(async () => {
  originalCvTimeout = process.env.CV_TIMEOUT_MS;
  process.env.CV_TIMEOUT_MS = "100"; // short abort for the stalled-fetch case
  app = await createTestApp();
  const owner = await register("owner", "Toko CV");
  agent = owner.agent;
  tenantId = owner.tenantId;
  userId = owner.userId;
  const other = await register("other", "Toko Lain");
  otherAgent = other.agent;
  otherTenantId = other.tenantId;
  // Same user may access two tenants; CV service must still scope rows by tenantId.
  await app.get(PrismaService).tenantMember.create({ data: { userId, tenantId: otherTenantId } });

  const product = await agent.post("/api/v1/products").set("X-Tenant-Id", tenantId).send({ name: "Saus A", price: 1000 }).expect(201);
  productId = product.body.id;
  const otherProduct = await otherAgent
    .post("/api/v1/products")
    .set("X-Tenant-Id", otherTenantId)
    .send({ name: "Saus Lain", price: 1000 })
    .expect(201);
  otherProductId = otherProduct.body.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await app?.close();
  if (originalCvTimeout === undefined) delete process.env.CV_TIMEOUT_MS;
  else process.env.CV_TIMEOUT_MS = originalCvTimeout;
});

describe("CV API", () => {
  test("requires auth, tenant header, and tenant membership", async () => {
    await request(app.getHttpServer()).get("/api/v1/cv/classes").expect(401);

    const missing = await agent.get("/api/v1/cv/classes").expect(400);
    expect(missing.body.code).toBe("TENANT_REQUIRED");

    const outsider = await register("outsider", "Toko Luar");
    const forbidden = await outsider.agent.get("/api/v1/cv/classes").set("X-Tenant-Id", tenantId).expect(403);
    expect(forbidden.body.code).toBe("TENANT_FORBIDDEN");
  });

  test("rejects invalid mapping DTO", async () => {
    const res = await agent
      .put("/api/v1/cv/mappings")
      .set("X-Tenant-Id", tenantId)
      .send({ classId: "abc", className: "", productId })
      .expect(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  test("uses default pagination for non-numeric limit and offset", async () => {
    const res = await agent.get("/api/v1/cv/scans?limit=abc&offset=xyz").set("X-Tenant-Id", tenantId).expect(200);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  test("rejects non-numeric classId", async () => {
    const res = await agent.delete("/api/v1/cv/mappings/abc").set("X-Tenant-Id", tenantId).expect(400);
    expect(res.body.code).toBe("INVALID_CLASS_ID");
  });

  test("rejects non-image and oversized upload", async () => {
    await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", Buffer.from("x"), "a.txt").expect(400);
    await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", Buffer.alloc(11 * 1024 * 1024), "rak.jpg").expect(413);
  });

  test("persists detections and applies tenant mapping", async () => {
    stubFetch({
      width: 10,
      height: 10,
      model_version: "test",
      detections: [{ class_id: 7, class_name: "saus-a", confidence: 0.9, xmin: 1, ymin: 2, xmax: 3, ymax: 4 }],
    });
    await agent
      .put("/api/v1/cv/mappings")
      .set("X-Tenant-Id", tenantId)
      .send({ classId: 7, className: "saus-a", productId })
      .expect(200);

    const res = await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", jpegBuffer, "rak.jpg").expect(201);
    scanId = res.body.scanId ?? res.body.id;
    expect(res.body.width).toBe(10);
    expect(res.body.modelVersion).toBe("test");
    expect(res.body.detections[0]).toMatchObject({ classId: 7, className: "saus-a", mappedProductId: productId });
  });

  test("exposes classes and scan history with metadata only", async () => {
    stubFetch({ nc: 2, names: ["saus-a", "saus-b"] });
    const classes = await agent.get("/api/v1/cv/classes").set("X-Tenant-Id", tenantId).expect(200);
    expect(classes.body).toEqual({ nc: 2, names: ["saus-a", "saus-b"] });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-cv-token"]).toBeDefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);

    const list = await agent.get("/api/v1/cv/scans").set("X-Tenant-Id", tenantId).expect(200);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
    expect(list.body.items[0].detections[0].mappedProductId).toBe(productId);
    expect(list.body.items[0]).not.toHaveProperty("imageBytes");

    const detail = await agent.get(`/api/v1/cv/scans/${scanId}`).set("X-Tenant-Id", tenantId).expect(200);
    expect(detail.body.id).toBe(scanId);
    expect(detail.body.detections).toHaveLength(1);
  });

  test("does not leak scan or mapping across tenants", async () => {
    await agent.get(`/api/v1/cv/scans/${scanId}`).set("X-Tenant-Id", otherTenantId).expect(404);
    const list = await agent.get("/api/v1/cv/mappings").set("X-Tenant-Id", otherTenantId).expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  test("rejects mapping to product from another tenant", async () => {
    const res = await agent
      .put("/api/v1/cv/mappings")
      .set("X-Tenant-Id", tenantId)
      .send({ classId: 9, className: "saus-lain", productId: otherProductId })
      .expect(400);
    expect(res.body.code).toBe("PRODUCT_NOT_FOUND");
  });

  test("deletes mapping", async () => {
    await agent.delete("/api/v1/cv/mappings/7").set("X-Tenant-Id", tenantId).expect(200, { ok: true });
    const list = await agent.get("/api/v1/cv/mappings").set("X-Tenant-Id", tenantId).expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  test("returns CV_UNAVAILABLE for malformed CV service payload", async () => {
    stubFetch({ width: 10, height: 10, model_version: "test" });
    let res = await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", jpegBuffer, "rak.jpg").expect(503);
    expect(res.body.code).toBe("CV_UNAVAILABLE");

    stubFetch({ width: 10, height: 10, model_version: "test", detections: "bad" });
    res = await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", jpegBuffer, "rak.jpg").expect(503);
    expect(res.body.code).toBe("CV_UNAVAILABLE");
  });

  test("returns CV_UNAVAILABLE when service is down", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", jpegBuffer, "rak.jpg").expect(503);
    expect(res.body.code).toBe("CV_UNAVAILABLE");
  });

  test("aborts stalled CV fetch and returns CV_UNAVAILABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    const res = await agent.post("/api/v1/cv/scan").set("X-Tenant-Id", tenantId).attach("file", jpegBuffer, "rak.jpg").expect(503);
    expect(res.body.code).toBe("CV_UNAVAILABLE");
  });
});
