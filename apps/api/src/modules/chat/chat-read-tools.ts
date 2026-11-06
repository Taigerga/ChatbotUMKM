import { Injectable } from "@nestjs/common";
import { MlInsightsService } from "../ml/ml-insights.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class ChatReadTools {
  constructor(private readonly prisma: PrismaService, private readonly insights: MlInsightsService) {}

  private parseDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  async getSalesSummary(tenantId: string, args: { from: string; to: string }) {
    const from = this.parseDate(args.from);
    const to = this.parseDate(args.to);
    if (!from || !to) return { error: "Tanggal tidak valid, minta pengguna menyebutkan tanggal yang jelas." };
    const [count, aggregate] = await Promise.all([
      this.prisma.sale.count({ where: { tenantId, status: "posted", occurredAt: { gte: from, lte: to } } }),
      this.prisma.sale.aggregate({ where: { tenantId, status: "posted", occurredAt: { gte: from, lte: to } }, _sum: { total: true } }),
    ]);
    return { from: args.from, to: args.to, saleCount: count, total: Number(aggregate._sum.total ?? 0).toFixed(2) };
  }

  async findProducts(tenantId: string, args: { query: string }) {
    const query = String(args.query ?? "").trim();
    if (!query) return { error: "Kata kunci produk kosong." };
    const products = await this.prisma.product.findMany({
      where: { tenantId, archivedAt: null, OR: [{ name: { contains: query } }, { sku: { contains: query } }] },
      select: { id: true, sku: true, name: true, price: true },
      take: 10,
    });
    return { query, products: products.map((p) => ({ ...p, price: Number(p.price).toFixed(2) })) };
  }

  async findCustomers(tenantId: string, args: { query: string }) {
    const query = String(args.query ?? "").trim();
    if (!query) return { error: "Kata kunci pelanggan kosong." };
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, archivedAt: null, OR: [{ name: { contains: query } }, { externalRef: { contains: query } }, { phone: { contains: query } }] },
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
      where: { tenantId, status: "posted", occurredAt: { gte: from, lte: to } },
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
      where: { tenantId, status: "posted", occurredAt: { gte: from, lte: to } },
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
    return this.insights.forecastSales(args.horizon ?? 7);
  }

  async rfmSegments(tenantId: string) {
    const result = await this.insights.rfmSegments(tenantId);
    if ("error" in result || "message" in result) return result;
    return {
      referenceDate: result.referenceDate,
      customerCount: result.customerCount,
      segments: result.segments.map((s: { customer_id: string; name: string; cluster: number }) => ({
        customer_id: s.customer_id,
        name: s.name,
        cluster: s.cluster,
      })),
    };
  }

  async churnRisk(tenantId: string) {
    const result = await this.insights.churnRisk(tenantId);
    if ("error" in result || "message" in result) return result;
    return {
      referenceDate: result.referenceDate,
      customerCount: result.customerCount,
      risks: result.risks.slice(0, 20).map((r: { customer_id: string; name: string; churn_risk: number }) => ({
        customer_id: r.customer_id,
        name: r.name,
        churn_risk: r.churn_risk,
      })),
    };
  }

  async anomalyDetection(tenantId: string) {
    const result = await this.insights.anomalyDetection(tenantId);
    if ("error" in result || "message" in result) return result;
    return { days: result.days, anomalies: result.anomalies };
  }

  async marketBasket(args: { basket: string[] }) {
    const basket = (args.basket ?? []).map((item) => String(item).trim()).filter(Boolean);
    if (basket.length === 0) return { error: "Daftar produk kosong." };
    const result = await this.insights.marketBasket(basket);
    if ("error" in result) return result;
    return { basket: result.basket, recommendations: result.recommendations };
  }
}
