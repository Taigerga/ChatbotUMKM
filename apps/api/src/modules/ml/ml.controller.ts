import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { MlService } from "./ml.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("ml")
export class MlController {
  constructor(private readonly ml: MlService) {}

  @Get("readiness")
  readiness() {
    return this.ml.readiness();
  }

  @Get("data-readiness")
  dataReadiness(@CurrentTenant() tenantId: string) {
    return this.ml.dataReadiness(tenantId);
  }

  @Get("models")
  models() {
    return this.ml.models();
  }

  @Post("train/:model")
  train(@Param("model") model: string) {
    return this.ml.train(model);
  }

  @Get("jobs/:id")
  job(@Param("id") id: string) {
    return this.ml.job(id);
  }

  @Post("predict/forecasting")
  forecasting(@Body() body?: { horizon?: number }) {
    return this.ml.predictForecasting(body?.horizon ?? 7);
  }

  @Post("predict/rfm")
  rfm(@Body() body: { customers: unknown[] }) {
    return this.ml.predictRfm(body?.customers ?? []);
  }

  @Post("predict/mba")
  mba(@Body() body: { basket: string[]; topN?: number }) {
    return this.ml.predictMba(body?.basket ?? [], body?.topN ?? 5);
  }

  @Post("predict/churn")
  churn(@Body() body: { customers: unknown[] }) {
    return this.ml.predictChurn(body?.customers ?? []);
  }

  @Post("predict/anomaly")
  anomaly(@Body() body: { series: unknown[] }) {
    return this.ml.predictAnomaly(body?.series ?? []);
  }
}
