import { Injectable } from "@nestjs/common";
import { MlService } from "../ml/ml.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class ChatReadTools {
  constructor(private readonly prisma: PrismaService, private readonly ml: MlService) {}

  private parseDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  async getSalesSummary(tenantId: string, args: { from: string; to: string }) {
    const from = this.parseDate(args.from);
    const to = this.parseDate(args.to);
    if (!from || !to) return { error: "Tanggal tidak valid, minta pengguna menyebutkan tanggal yang jelas." };
    const [count, aggregate] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, occurredAt: { gte: from, lte: to } } }),
      this.prisma.sale.aggregate({ where: { tenantId, occurredAt: { gte: from, lte: to } }, _sum: { total: true } }),
    ]);
    return { from: args.from, to: args.to, saleCount: count, total: Number(aggregate._sum.total ?? 0).toFixed(2) };
  }

  async findProducts(tenantId: string, args: { query: string }) {
    const query = String(args.query ?? "").trim();
    if (!query) return { error: "Kata kunci produk kosong." };
    const products = await this.prisma.product.findMany({
      where: { tenantId, OR: [{ name: { contains: query } }, { sku: { contains: query } }] },
      select: { id: true, sku: true, name: true, price: true },
      take: 10,
    });
    return { query, products: products.map((p) => ({ ...p, price: Number(p.price).toFixed(2) })) };
  }

  async findCustomers(tenantId: string, args: { query: string }) {
    const query = String(args.query ?? "").trim();
    if (!query) return { error: "Kata kunci pelanggan kosong." };
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, OR: [{ name: { contains: query } }, { externalRef: { contains: query } }, { phone: { contains: query } }] },
      select: { id: true, externalRef: true, name: true, phone: true, email: true },
      take: 10,
    });
    return { query, customers };
  }

  async topProducts(tenantId: string, args: { from: string; to: string; limit?: number }) {
    const from = this.parseDate(args.from);
    const to = this.parseDate(args.to);
    if (!from || !to) return { error: "Tanggal tidak valid." };
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, occurredAt: { gte: from, lte: to } },
      include: { items: true },
    });
    const map = new Map<string, { name: string; qty: number; total: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId ?? item.description;
        const current = map.get(key) ?? { name: item.description, qty: 0, total: 0 };
        current.qty += item.qty;
        current.total += Number(item.lineTotal);
        map.set(key, current);
      }
    }
    const items = Array.from(map.values())
      .sort((a, b) => b.qty - a.qty || b.total - a.total)
      .slice(0, limit)
      .map((p) => ({ name: p.name, qty: p.qty, total: p.total.toFixed(2) }));
    return { from: args.from, to: args.to, items };
  }

  async topCustomers(tenantId: string, args: { from: string; to: string; limit?: number }) {
    const from = this.parseDate(args.from);
    const to = this.parseDate(args.to);
    if (!from || !to) return { error: "Tanggal tidak valid." };
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, occurredAt: { gte: from, lte: to } },
    });
    const customerIds = Array.from(new Set(sales.map((s) => s.customerId).filter((id): id is string => Boolean(id))));
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({ where: { tenantId, id: { in: customerIds } }, select: { id: true, name: true } })
      : [];
    const customerName = new Map(customers.map((c) => [c.id, c.name]));
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const sale of sales) {
      const key = sale.customerId ?? "walk-in";
      const name = customerName.get(sale.customerId ?? "") ?? "Tanpa pelanggan";
      const current = map.get(key) ?? { name, total: 0, count: 0 };
      current.total += Number(sale.total);
      current.count += 1;
      map.set(key, current);
    }
    const items = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((c) => ({ name: c.name, total: c.total.toFixed(2), count: c.count }));
    return { from: args.from, to: args.to, items };
  }

  async forecastSales(args: { horizon?: number }) {
    const horizon = Math.min(Math.max(args.horizon ?? 7, 1), 30);
    try {
      const result = await this.ml.predictForecasting(horizon);
      return {
        horizon,
        predictions: result.predictions,
        warning: "Ramalan berasal dari model global dataset 150k dan data historis global, bukan data toko Anda. Gunakan sebagai referensi.",
      };
    } catch (error) {
      return { error: "Model forecasting belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async rfmSegments(tenantId: string) {
    try {
      const sales = await this.prisma.sale.findMany({
        where: { tenantId },
      });
      const customerRows = await this.prisma.customer.findMany({ where: { tenantId }, select: { id: true, name: true } });
      const customerNameMap = new Map(customerRows.map((c) => [c.id, c.name]));
      const ref = sales.reduce((max, sale) => (sale.occurredAt > max ? sale.occurredAt : max), new Date(0));
      const reference = ref.getTime() === 0 ? new Date() : ref;
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
        recency: Math.max(0, Math.floor((reference.getTime() - c.last.getTime()) / 86400000)),
        frequency: c.freq,
        monetary: Number(c.monetary.toFixed(2)),
      }));
      if (customers.length === 0) return { message: "Belum ada data pelanggan/transaksi untuk segmentasi." };
      const result = await this.ml.predictRfm(customers);
      const byId = new Map(customers.map((c) => [c.customer_id, c]));
      const segments = (result.segments ?? []).map((segment: { customer_id: string; cluster: number }) => ({
        customer_id: segment.customer_id,
        name: byId.get(segment.customer_id)?.name ?? segment.customer_id,
        cluster: segment.cluster,
      }));
      return { referenceDate: reference.toISOString(), customerCount: customers.length, segments };
    } catch (error) {
      return { error: "Model RFM belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async churnRisk(tenantId: string) {
    try {
      const customers = await this.prisma.customer.findMany({ where: { tenantId } });
      const sales = await this.prisma.sale.findMany({ where: { tenantId } });
      const ref = sales.reduce((max, sale) => (sale.occurredAt > max ? sale.occurredAt : max), new Date());
      const reference = ref.getTime() === 0 ? new Date() : ref;
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
        .slice(0, 20);
      return { referenceDate: reference.toISOString(), customerCount: payload.length, risks };
    } catch (error) {
      return { error: "Model churn belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async anomalyDetection(tenantId: string) {
    try {
      const sales = await this.prisma.sale.findMany({ where: { tenantId } });
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
      return { days: series.length, anomalies: result.anomalies };
    } catch (error) {
      return { error: "Model anomaly belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }

  async marketBasket(args: { basket: string[] }) {
    const basket = (args.basket ?? []).map((item) => String(item).trim()).filter(Boolean);
    if (basket.length === 0) return { error: "Daftar produk kosong." };
    try {
      const result = await this.ml.predictMba(basket);
      return { basket, recommendations: result.recommendations };
    } catch (error) {
      return { error: "Model market basket belum siap atau layanan ML tidak tersedia.", detail: String(error) };
    }
  }
}
