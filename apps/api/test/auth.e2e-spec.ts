import "dotenv/config";
import { afterAll, expect, test } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "./utils/test-app";

let app: INestApplication;
const email = `auth-${Date.now()}@toko.local`;

afterAll(async () => {
  await app?.close();
});

test("register membuat tenant + membership + cookie httpOnly", async () => {
  app = await createTestApp();
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send({ email, password: "rahasia123", name: "A", storeName: "Toko A" })
    .expect(201);

  expect(res.body.tenants).toHaveLength(1);
  expect(res.body.tenants[0].name).toBe("Toko A");
  expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
  expect(res.body.user).not.toHaveProperty("passwordHash");
});

test("login password salah 401 dan pesan generik", async () => {
  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send({ email, password: "salah" })
    .expect(401);
  expect(res.body.message).toBe("Email atau password salah");
});

test("login benar lalu /auth/me mengembalikan user", async () => {
  const agent = request.agent(app.getHttpServer());
  await agent.post("/api/v1/auth/login").send({ email, password: "rahasia123" }).expect(200);
  const me = await agent.get("/api/v1/auth/me").expect(200);
  expect(me.body.user.email).toBe(email);
});

test("me tanpa cookie 401", async () => {
  await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);
});
