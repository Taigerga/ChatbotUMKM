import { Injectable } from "@nestjs/common";
import { MlService } from "./ml.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

/**
 * Analisis cerdas: model global diterapkan pada fitur dari data toko.
 * Dipakai oleh halaman web (ML > Analisis Cerdas) dan read-tools chatbot.
 */
@Injectable()
export class MlInsightsService {
  constructor(private readonly prisma: PrismaService, private readonly ml: MlService) {}

  private saleWhere(tenantId: string) {
    return { tenantId, status: "posted" as const };
  }

  async forecastSales(horizon = 7) {
    const safe = Math.min(Math.max(horizon, 1), 30);
    try {
      const result = await this.ml.predictForecasting(safe);
      return {
        horizon: safe,
        predictions: result.predictions,
        warning: "Ramalan dari model global dataset 150k, bukan data toko Anda. Gunakan sebagai referensi.",
      };
    } catch (error) {
      return { error: "Model forecasting belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async rfmSegments(tenantId: string) {
    try {
      const [sales, customerRows] = await Promise.all([
        this.prisma.sale.findMany({ where: this.saleWhere(tenantId) }),
        this.prisma.customer.findMany({ where: { tenantId, archivedAt: null }, select: { id: true, name: true } }),
      ]);
      const customerNameMap = new Map(customerRows.map((c) => [c.id, c.name]));
      const reference = sales.reduce((max, sale) => (sale.occurredAt > max ? sale.occurredAt : max), new Date(0));
      const ref = reference.getTime() === 0 ? new Date() : reference;
      const aggregates = new Map<string, { customer_id: string; name: string; last: Date; freq: number; monetary: number }>();
      for (const sale of sales) {
        if (!sale.customerId) continue;
        const current = aggregates.get(sale.customerId) ?? {
          customer_id: sale.customerId,
          name: customerNameMap.get(sale.customerId) ?? sale.customerId,
          last: sale.occurredAt,
          freq: 0,
          monetary: 0,
        };
        current.last = sale.occurredAt > current.last ? sale.occurredAt : current.last;
        current.freq += 1;
        current.monetary += Number(sale.total);
        aggregates.set(sale.customerId, current);
      }
      const customers = Array.from(aggregates.values()).map((c) => ({
        customer_id: c.customer_id,
        name: c.name,
        recency: Math.max(0, Math.floor((ref.getTime() - c.last.getTime()) / 86400000)),
        frequency: c.freq,
        monetary: Number(c.monetary.toFixed(2)),
      }));
      if (customers.length === 0) return { message: "Belum ada data pelanggan/transaksi untuk segmentasi." };
      const result = await this.ml.predictRfm(customers);
      const byId = new Map(customers.map((c) => [c.customer_id, c]));
      const segments = (result.segments ?? []).map((segment: { customer_id: string; cluster: number; segment?: string }) => ({
        customer_id: segment.customer_id,
        name: byId.get(segment.customer_id)?.name ?? segment.customer_id,
        cluster: segment.cluster,
        segment: segment.segment ?? `Cluster ${segment.cluster}`,
        recency: byId.get(segment.customer_id)?.recency ?? 0,
        frequency: byId.get(segment.customer_id)?.frequency ?? 0,
        monetary: byId.get(segment.customer_id)?.monetary ?? 0,
      }));
      return { referenceDate: ref.toISOString(), customerCount: customers.length, segments, warning: "Segmentasi dari model global dataset 150k, diterapkan pada fitur pelanggan toko Anda." };
    } catch (error) {
      return { error: "Model RFM belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async churnRisk(tenantId: string) {
    try {
      const [customers, sales] = await Promise.all([
        this.prisma.customer.findMany({ where: { tenantId, archivedAt: null } }),
        this.prisma.sale.findMany({ where: this.saleWhere(tenantId) }),
      ]);
      const reference = sales.reduce((max, sale) => (sale.occurredAt > max ? sale.occurredAt : max), new Date());
      const aggregates = new Map<string, { count: number; total: number; last: Date }>();
      for (const sale of sales) {
        if (!sale.customerId) continue;
        const current = aggregates.get(sale.customerId) ?? { count: 0, total: 0, last: sale.occurredAt };
        current.count += 1;
        current.total += Number(sale.total);
        current.last = sale.occurredAt > current.last ? sale.occurredAt : current.last;
        aggregates.set(sale.customerId, current);
      }
      const payload = customers.map((customer) => {
        const agg = aggregates.get(customer.id);
        return {
          customer_id: customer.id,
          name: customer.name,
          customer_age: 0,
          days_since_last: agg ? Math.max(0, Math.floor((reference.getTime() - agg.last.getTime()) / 86400000)) : 9999,
          order_count: agg?.count ?? 0,
          total_spend: agg ? Number(agg.total.toFixed(2)) : 0,
        };
      });
      if (payload.length === 0) return { message: "Belum ada pelanggan untuk analisis churn." };
      const result = await this.ml.predictChurn(payload);
      const byId = new Map(payload.map((p) => [p.customer_id, p]));
      const risks = (result.risks ?? [])
        .map((risk: { customer_id: string; churn_risk: number }) => ({
          customer_id: risk.customer_id,
          name: byId.get(risk.customer_id)?.name ?? risk.customer_id,
          churn_risk: risk.churn_risk,
        }))
        .sort((a: { churn_risk: number }, b: { churn_risk: number }) => b.churn_risk - a.churn_risk)
        .slice(0, 50);
      return { referenceDate: reference.toISOString(), customerCount: payload.length, risks, warning: "Skor risiko dari model global dataset 150k, diterapkan pada histori toko Anda." };
    } catch (error) {
      return { error: "Model churn belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async anomalyDetection(tenantId: string) {
    try {
      const sales = await this.prisma.sale.findMany({ where: this.saleWhere(tenantId) });
      const map = new Map<string, number>();
      for (const sale of sales) {
        const key = sale.occurredAt.toISOString().slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + Number(sale.total));
      }
      const series = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));
      if (series.length === 0) return { message: "Belum ada data penjualan untuk deteksi anomali." };
      const result = await this.ml.predictAnomaly(series);
      return {
        days: series.length,
        series,
        anomalies: result.anomalies,
        anomalyCount: (result.anomalies ?? []).filter((a: { is_anomaly: boolean }) => a.is_anomaly).length,
        warning: "Baseline dari model global dataset 150k, diterapkan pada penjualan harian toko Anda.",
      };
    } catch (error) {
      return { error: "Model anomaly belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async marketBasket(basket: string[], topN = 5) {
    const items = (basket ?? []).map((item) => String(item).trim()).filter(Boolean);
    if (items.length === 0) return { error: "Pilih minimal satu produk untuk mendapat rekomendasi." };
    try {
      const result = await this.ml.predictMba(items, topN);
      return { basket: items, recommendations: result.recommendations, warning: "Aturan asosiasi dari dataset publik 150k, bukan transaksi toko Anda." };
    } catch (error) {
      return { error: "Model market basket belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  /** Kumpulkan data toko untuk pelatihan model per-toko, lalu kirim ke layanan ML. */
  async collectTenantPayload(tenantId: string, horizon = 7) {
    const sales = await this.prisma.sale.findMany({
      where: this.saleWhere(tenantId),
      select: { occurredAt: true, total: true, customerId: true, items: { select: { description: true, qty: true } } },
      orderBy: { occurredAt: "asc" },
    });
    const dailyMap = new Map<string, number>();
    const baskets: string[][] = [];
    for (const sale of sales) {
      const key = sale.occurredAt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(sale.total));
      baskets.push(sale.items.filter((item) => item.qty > 0).map((item) => item.description));
    }
    const reference = sales.length ? sales[sales.length - 1].occurredAt : new Date();
    const customers = await this.prisma.customer.findMany({ where: { tenantId, archivedAt: null }, select: { id: true, name: true, createdAt: true } });
    const agg = new Map<string, { count: number; total: number; last: Date }>();
    for (const sale of sales) {
      if (!sale.customerId) continue;
      const current = agg.get(sale.customerId) ?? { count: 0, total: 0, last: sale.occurredAt };
      current.count += 1;
      current.total += Number(sale.total);
      current.last = sale.occurredAt > current.last ? sale.occurredAt : current.last;
      agg.set(sale.customerId, current);
    }
    const customerRows = customers.map((c) => {
      const a = agg.get(c.id);
      return {
        customer_id: c.id,
        name: c.name,
        recency: a ? Math.max(0, Math.floor((reference.getTime() - a.last.getTime()) / 86400000)) : 9999,
        frequency: a?.count ?? 0,
        monetary: a ? Number(a.total.toFixed(2)) : 0,
        days_since_last: a ? Math.max(0, Math.floor((reference.getTime() - a.last.getTime()) / 86400000)) : 9999,
        order_count: a?.count ?? 0,
        total_spend: a ? Number(a.total.toFixed(2)) : 0,
      };
    });
    return {
      tenant_id: tenantId,
      daily: Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value: Number(value.toFixed(2)) })),
      customers: customerRows,
      transactions: baskets.filter((basket) => basket.length >= 2).map((basket) => Array.from(new Set(basket))),
      horizon,
    };
  }
}
