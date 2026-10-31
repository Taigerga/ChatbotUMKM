import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;

afterAll(async () => {
  await app?.close();
});

test("health 200 dan tidak membocorkan koneksi", async () => {
  app = await createTestApp();
  const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
  expect(res.body).toEqual({ status: "ok", db: "up" });
  expect(JSON.stringify(res.body)).not.toMatch(/password|mysql:\/\//i);
});
