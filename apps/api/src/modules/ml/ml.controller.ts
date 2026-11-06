import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { MlService } from "./ml.service.js";
import { MlInsightsService } from "./ml-insights.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("ml")
export class MlController {
  constructor(private readonly ml: MlService, private readonly insights: MlInsightsService) {}

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

  // ---- Analisis cerdas: model global diterapkan ke data toko -----------------

  @Get("insights/forecast")
  insightForecast(@Query("horizon") horizon?: string) {
    return this.insights.forecastSales(Number(horizon) || 7);
  }

  @Get("insights/rfm")
  insightRfm(@CurrentTenant() tenantId: string) {
    return this.insights.rfmSegments(tenantId);
  }

  @Get("insights/churn")
  insightChurn(@CurrentTenant() tenantId: string) {
    return this.insights.churnRisk(tenantId);
  }

  @Get("insights/anomaly")
  insightAnomaly(@CurrentTenant() tenantId: string) {
    return this.insights.anomalyDetection(tenantId);
  }

  @Post("insights/mba")
  insightMba(@Body() body: { basket: string[]; topN?: number }) {
    return this.insights.marketBasket(body?.basket ?? [], body?.topN ?? 5);
  }

  // ---- Model toko: latih 5 model dari data toko ------------------------------

  @Post("tenant/train")
  tenantTrain(@CurrentTenant() tenantId: string, @Body() body?: { horizon?: number }) {
    return this.insights.collectTenantPayload(tenantId, body?.horizon ?? 7).then((payload) => this.ml.trainTenant(payload));
  }

  @Get("tenant/train/:jobId")
  tenantTrainJob(@Param("jobId") jobId: string) {
    return this.ml.job(jobId);
  }

  @Get("tenant/results")
  tenantResults(@CurrentTenant() tenantId: string) {
    return this.ml.tenantResults(tenantId);
  }
}
