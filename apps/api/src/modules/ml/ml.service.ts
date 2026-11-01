import { Injectable } from "@nestjs/common";
import { loadEnv } from "../../config/env.js";

@Injectable()
export class MlService {
  private readonly baseUrl = loadEnv().ML_SERVICE_URL;
  private readonly token = loadEnv().ML_INTERNAL_TOKEN;

  private headers() {
    return { "x-ml-token": this.token, "content-type": "application/json" };
  }

  async readiness() {
    return this.request("/readiness");
  }

  async models() {
    return this.request("/models");
  }

  async train(model: string) {
    return this.request(`/train/${model}`, { method: "POST" });
  }

  async job(id: string) {
    return this.request(`/jobs/${id}`);
  }

  async predictForecasting(horizon = 7) {
    return this.request(`/predict/forecasting?horizon=${horizon}`, { method: "POST" });
  }

  async predictRfm(customers: unknown[]) {
    return this.request("/predict/rfm", { method: "POST", body: JSON.stringify({ customers }) });
  }

  async predictMba(basket: string[], topN = 5) {
    return this.request("/predict/mba", { method: "POST", body: JSON.stringify({ basket, top_n: topN }) });
  }

  async predictChurn(customers: unknown[]) {
    return this.request("/predict/churn", { method: "POST", body: JSON.stringify({ customers }) });
  }

  async predictAnomaly(series: unknown[]) {
    return this.request("/predict/anomaly", { method: "POST", body: JSON.stringify({ series }) });
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { ...this.headers(), ...(init.headers ?? {}) } });
    if (!response.ok) throw new Error(`ML service error ${response.status}`);
    return response.json();
  }
}
