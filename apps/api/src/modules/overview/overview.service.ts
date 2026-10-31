import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string, from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, occurredAt: { gte: startDate, lte: endDate } },
      include: { items: true },
      orderBy: { occurredAt: "asc" },
    });

    const customerIds = Array.from(new Set(sales.map((s) => s.customerId).filter((id): id is string => Boolean(id))));
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({ where: { tenantId, id: { in: customerIds } }, select: { id: true, name: true } })
      : [];
    const customerName = new Map(customers.map((c) => [c.id, c.name]));

    const total = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const subtotal = sales.reduce((sum, s) => sum + Number(s.subtotal), 0);
    const itemCount = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.qty, 0), 0);

    const byDay = new Map<string, number>();
    for (const sale of sales) {
      const key = sale.occurredAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(sale.total));
    }
    const daily = Array.from(byDay.entries()).map(([date, value]) => ({ date, value: value.toFixed(2) }));

    const productMap = new Map<string, { name: string; qty: number; total: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId ?? item.description;
        const current = productMap.get(key) ?? { name: item.description, qty: 0, total: 0 };
        current.qty += item.qty;
        current.total += Number(item.lineTotal);
        productMap.set(key, current);
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((p) => ({ name: p.name, qty: p.qty, total: p.total.toFixed(2) }));

    const customerMap = new Map<string, { name: string; total: number; count: number }>();
    for (const sale of sales) {
      const key = sale.customerId ?? "walk-in";
      const name = customerName.get(sale.customerId ?? "") ?? "Tanpa pelanggan";
      const current = customerMap.get(key) ?? { name, total: 0, count: 0 };
      current.total += Number(sale.total);
      current.count += 1;
      customerMap.set(key, current);
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({ name: c.name, total: c.total.toFixed(2), count: c.count }));

    return {
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      saleCount: sales.length,
      total: total.toFixed(2),
      subtotal: subtotal.toFixed(2),
      itemCount,
      averageOrder: sales.length ? (total / sales.length).toFixed(2) : "0.00",
      daily,
      topProducts,
      topCustomers,
      recentSales: sales.slice(-5).reverse().map((s) => ({ id: s.id, occurredAt: s.occurredAt, total: Number(s.total).toFixed(2) })),
    };
  }
}
