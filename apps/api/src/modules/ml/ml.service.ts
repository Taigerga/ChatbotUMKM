import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { loadEnv } from "../../config/env.js";

@Injectable()
export class MlService {
  constructor(private readonly prisma: PrismaService) {}
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

  async dataReadiness(tenantId: string) {
    const [sales, customers, products] = await Promise.all([
      this.prisma.sale.findMany({ where: { tenantId }, select: { occurredAt: true, customerId: true, items: { select: { qty: true } } } }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
    ]);
    const distinctDays = new Set(sales.map((s) => s.occurredAt.toISOString().slice(0, 10))).size;
    const distinctCustomers = new Set(sales.map((s) => s.customerId).filter(Boolean)).size;
    const multiItemSales = sales.filter((s) => s.items.length >= 2).length;
    const spanDays = sales.length
      ? Math.round((Math.max(...sales.map((s) => s.occurredAt.getTime())) - Math.min(...sales.map((s) => s.occurredAt.getTime()))) / 86_400_000)
      : 0;

    const status = (ready: boolean, limited: boolean) => (ready ? "ready" : limited ? "limited" : "not_ready");

    return {
      counts: { sales: sales.length, distinctDays, customers: customers || distinctCustomers, products, multiItemSales, distinctCustomers, spanDays },
      models: {
        forecasting: {
          status: status(distinctDays >= 30 && sales.length >= 30, distinctDays >= 7),
          reason: distinctDays >= 30 ? "Cukup hari transaksi untuk ramalan indikatif." : distinctDays >= 7 ? "Hari transaksi terbatas; ramalan hanya indikatif." : "Belum cukup hari transaksi.",
          steps: distinctDays < 30 ? ["Catat transaksi harian minimal 30 hari."] : [],
        },
        rfm: {
          status: status(distinctCustomers >= 50, distinctCustomers >= 10),
          reason: distinctCustomers >= 50 ? "Cukup pelanggan bertransaksi." : distinctCustomers >= 10 ? "Pelanggan bertransaksi terbatas." : "Belum cukup pelanggan bertransaksi.",
          steps: distinctCustomers < 50 ? ["Pastikan penjualan dihubungkan ke pelanggan."] : [],
        },
        mba: {
          status: status(multiItemSales >= 100, multiItemSales >= 30),
          reason: multiItemSales >= 100 ? "Cukup transaksi multi-item." : multiItemSales >= 30 ? "Transaksi multi-item terbatas." : "Belum cukup transaksi multi-item.",
          steps: multiItemSales < 100 ? ["Catat penjualan dengan lebih dari satu item per transaksi."] : [],
        },
        churn: {
          status: status(distinctCustomers >= 30 && spanDays >= 180, distinctCustomers >= 10),
          reason: distinctCustomers >= 30 && spanDays >= 180 ? "Cukup histori pelanggan." : "Histori pelanggan belum cukup untuk churn.",
          steps: distinctCustomers < 30 || spanDays < 180 ? ["Akumulasi transaksi minimal 6 bulan dengan pelanggan terhubung."] : [],
        },
        anomaly: {
          status: status(distinctDays >= 60, distinctDays >= 14),
          reason: distinctDays >= 60 ? "Cukup hari transaksi untuk baseline." : distinctDays >= 14 ? "Baseline anomali terbatas." : "Belum cukup hari transaksi.",
          steps: distinctDays < 60 ? ["Catat transaksi harian minimal 60 hari."] : [],
        },
      },
    };
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { ...this.headers(), ...(init.headers ?? {}) } });
    if (!response.ok) throw new Error(`ML service error ${response.status}`);
    return response.json();
  }
}
