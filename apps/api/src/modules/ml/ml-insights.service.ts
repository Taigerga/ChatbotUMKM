import { Injectable } from "@nestjs/common";
import { MlService } from "./ml.service.js";
import { PrismaService } from "../../prisma/prisma.service.js";

type SegmentLabel = { label: string; action: string };

const SEGMENT_LABELS: { prefix: string; label: string; action: string }[] = [
  {
    prefix: "Champion",
    label: "Pelanggan setia",
    action: "Beri apresiasi: potongan harga kecil atau kabar stok baru lebih dulu.",
  },
  {
    prefix: "Loyal",
    label: "Pelanggan rutin",
    action: "Jaga ritme: tawarkan paket hemat barang yang biasa dibeli.",
  },
  {
    prefix: "At Risk",
    label: "Perlu ditebus",
    action: "Hubungi lewat WhatsApp dan tawarkan promo singkat agar kembali.",
  },
  {
    prefix: "Lost",
    label: "Hampir hilang",
    action: "Kirim pengingat ramah; bila tidak kembali, cukup catat sebagai arsip.",
  },
];

function segmentLabel(segment: string, cluster: number): SegmentLabel {
  const match = SEGMENT_LABELS.find((item) => segment.startsWith(item.prefix));
  if (match) return { label: match.label, action: match.action };
  return { label: `Segmen ${cluster + 1}`, action: "Amati kebiasaan belanja segmen ini sebelum memberi tawaran." };
}

function zeroFill(points: { date: string; value: number }[]) {
  if (points.length === 0) return points;
  const map = new Map(points.map((point) => [point.date, point.value]));
  const sorted = points.map((point) => point.date).sort();
  const start = new Date(`${sorted[0]}T00:00:00.000Z`);
  const end = new Date(`${sorted[sorted.length - 1]}T00:00:00.000Z`);
  const out: { date: string; value: number }[] = [];
  for (let day = start.getTime(); day <= end.getTime(); day += 86_400_000) {
    const key = new Date(day).toISOString().slice(0, 10);
    out.push({ date: key, value: map.get(key) ?? 0 });
  }
  return out;
}

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

  async forecastSales(tenantId: string, horizon = 7) {
    const safe = Math.min(Math.max(horizon, 1), 30);
    try {
      const now = new Date();
      const start = new Date(now.getTime() - 29 * 86_400_000);
      const sales = await this.prisma.sale.findMany({
        where: { ...this.saleWhere(tenantId), occurredAt: { gte: start, lte: now } },
        select: { total: true },
      });
      const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
      const targetDaily = total / 30;

      const result = await this.ml.predictForecasting(safe, targetDaily);
      const predictions: { date: string; value: number }[] = result.predictions ?? [];
      const dailyAverage = predictions.length
        ? predictions.reduce((sum, point) => sum + Number(point.value), 0) / predictions.length
        : 0;
      const trendPct = targetDaily > 0 ? ((dailyAverage - targetDaily) / targetDaily) * 100 : 0;
      const gap = predictions.reduce((sum, point) => sum + Number(point.value), 0);

      return {
        horizon: safe,
        predictions,
        calibration: result.calibration ?? { factor: 1, target_daily: targetDaily, anchored_to: "today" },
        summary: {
          dailyAverage,
          weeklyTotal: gap,
          trendPct,
          last30Daily: targetDaily,
        },
        calibrated: targetDaily > 0,
        warning:
          targetDaily > 0
            ? "Bentuk tren dari model umum dataset 150k; besar angkanya disesuaikan omzet toko Anda 30 hari terakhir."
            : "Belum ada penjualan 30 hari terakhir. Angka masih memakai skala dataset umum, jadi hanya gambaran kasar.",
      };
    } catch (error) {
      return { error: "Model ramalan belum siap atau layanan ML tidak tersedia.", detail: String(error) };
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
      const result = await this.ml.predictRfm(customers, true);
      const byId = new Map(customers.map((c) => [c.customer_id, c]));
      const segments = (result.segments ?? []).map((segment: { customer_id: string; cluster: number; segment?: string }) => {
        const raw = segment.segment ?? `Cluster ${segment.cluster}`;
        const { label } = segmentLabel(raw, segment.cluster);
        return {
          customer_id: segment.customer_id,
          name: byId.get(segment.customer_id)?.name ?? segment.customer_id,
          cluster: segment.cluster,
          segment: raw,
          segmentLabel: label,
          label,
          recency: byId.get(segment.customer_id)?.recency ?? 0,
          frequency: byId.get(segment.customer_id)?.frequency ?? 0,
          monetary: byId.get(segment.customer_id)?.monetary ?? 0,
        };
      });

      const grouped = new Map<string, { segment: string; label: string; action: string; customers: number; monetary: number }>();
      for (const row of segments) {
        const meta = segmentLabel(row.segment, row.cluster);
        const current = grouped.get(meta.label) ?? {
          segment: row.segment,
          label: meta.label,
          action: meta.action,
          customers: 0,
          monetary: 0,
        };
        current.customers += 1;
        current.monetary += row.monetary;
        grouped.set(meta.label, current);
      }
      const groups = Array.from(grouped.values())
        .map((group) => ({ ...group, avgMonetary: group.customers ? group.monetary / group.customers : 0 }))
        .sort((a, b) => b.customers - a.customers);

      return {
        referenceDate: ref.toISOString(),
        customerCount: customers.length,
        segments,
        groups,
        warning: "Kelompok pelanggan dari model umum dataset 150k, jarak fitur disesuaikan dengan pelanggan toko Anda.",
      };
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
      // Hanya pelanggan yang pernah bertransaksi; yang belum pernah tidak diberi "9999 hari".
      const payload = customers
        .map((customer) => {
          const agg = aggregates.get(customer.id);
          return {
            customer_id: customer.id,
            name: customer.name,
            customer_age: 0,
            days_since_last: agg ? Math.max(0, Math.floor((reference.getTime() - agg.last.getTime()) / 86400000)) : 0,
            order_count: agg?.count ?? 0,
            total_spend: agg ? Number(agg.total.toFixed(2)) : 0,
          };
        })
        .filter((row) => row.order_count > 0);

      if (payload.length === 0) return { message: "Belum ada pelanggan yang pernah bertransaksi." };
      const result = await this.ml.predictChurn(payload);
      const byId = new Map(payload.map((p) => [p.customer_id, p]));
      const scored = (result.risks ?? [])
        .map((risk: { customer_id: string; churn_risk: number }) => ({
          customer_id: risk.customer_id,
          name: byId.get(risk.customer_id)?.name ?? risk.customer_id,
          churn_risk: risk.churn_risk,
          lastPurchaseDays: byId.get(risk.customer_id)?.days_since_last ?? 0,
        }))
        .sort((a: { churn_risk: number }, b: { churn_risk: number }) => b.churn_risk - a.churn_risk);

      const n = scored.length;
      const highCount = n < 5 ? 0 : Math.max(1, Math.round(n * 0.1));
      const mediumCount = n < 5 ? 0 : Math.max(1, Math.round(n * 0.2));
      const counts = { high: highCount, medium: mediumCount, low: n - highCount - mediumCount };
      const risks = scored.map((row: { customer_id: string; name: string; churn_risk: number; lastPurchaseDays: number }, index: number) => ({
        ...row,
        score: row.churn_risk,
        band: n < 5 ? "medium" : index < highCount ? "high" : index < highCount + mediumCount ? "medium" : "low",
      }));

      return {
        referenceDate: reference.toISOString(),
        customerCount: payload.length,
        risks,
        counts,
        limited: n < 5,
        warning: "Tingkat dihitung dari peringkat skor model umum dataset 150k, bukan peluang pasti.",
      };
    } catch (error) {
      return { error: "Model risiko berhenti belum siap atau layanan ML tidak tersedia.", detail: String(error) };
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
      const sparse = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));
      if (sparse.length === 0) return { message: "Belum ada data penjualan untuk deteksi anomali." };
      const series = zeroFill(sparse);
      const result = await this.ml.predictAnomaly(series, true);
      const anomalies = (result.anomalies ?? [])
        .filter((row: { is_anomaly: boolean }) => row.is_anomaly)
        .map((row: { date: string; value: number; baseline: number }) => ({
          date: row.date,
          value: row.value,
          baseline: row.baseline,
          direction: row.value >= row.baseline ? "high" : "low",
        }));
      return {
        days: series.length,
        series,
        anomalies,
        anomalyCount: anomalies.length,
        warning: "Pola hari dari model umum dataset 150k; batas kewajaran disesuaikan penjualan toko Anda.",
      };
    } catch (error) {
      return { error: "Model anomali belum siap atau layanan ML tidak tersedia.", detail: String(error) };
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

  /** Dua panel: pasangan nyata dari transaksi toko + contoh aturan global. */
  async basketInsight(tenantId: string, topN = 5) {
    try {
      const sales = await this.prisma.sale.findMany({
        where: this.saleWhere(tenantId),
        select: { items: { select: { description: true, qty: true } } },
      });
      const baskets = sales
        .map((sale) => Array.from(new Set(sale.items.filter((item) => item.qty > 0).map((item) => item.description.trim()).filter(Boolean))))
        .filter((basket) => basket.length >= 2);
      const total = baskets.length;

      const pairs = new Map<string, { a: string; b: string; count: number }>();
      const itemCount = new Map<string, number>();
      for (const basket of baskets) {
        for (const item of basket) itemCount.set(item, (itemCount.get(item) ?? 0) + 1);
        for (let i = 0; i < basket.length; i += 1) {
          for (let j = i + 1; j < basket.length; j += 1) {
            const [a, b] = [basket[i], basket[j]].sort();
            const key = `${a}||${b}`;
            const current = pairs.get(key) ?? { a, b, count: 0 };
            current.count += 1;
            pairs.set(key, current);
          }
        }
      }
      const minSupport = total > 0 ? Math.max(3 / total, 0.01) : 0.01;
      const tenantPairs = Array.from(pairs.values())
        .filter((pair) => pair.count / total >= minSupport)
        .map((pair) => {
          const confidence = pair.count / (itemCount.get(pair.a) ?? 1);
          const lift = confidence / (itemCount.get(pair.b) ?? total) * total;
          return { ...pair, total, confidence, lift };
        })
        .sort((x, y) => y.lift - x.lift || y.confidence - x.confidence)
        .slice(0, topN);

      let globalReference: unknown[] = [];
      try {
        const reference = await this.ml.referenceMba(3);
        globalReference = reference.rules ?? [];
      } catch {
        globalReference = [];
      }

      return {
        transactionCount: total,
        minSupport,
        tenantPairs,
        globalReference,
        warning: total === 0
          ? "Butuh transaksi dengan minimal dua item agar pasangan bisa dihitung. Catat penjualan beberapa barang sekaligus."
          : "Pasangan toko dihitung langsung dari nota Anda. Contoh dataset umum hanya pembanding, bukan produk toko.",
      };
    } catch (error) {
      return { error: "Analisis pasangan produk belum bisa dijalankan.", detail: String(error) };
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
    // Hari tanpa nota diisi 0 supaya ramalan & anomali toko memakai penyebut hari kalender,
    // sebanding dengan tab Analisis cerdas.
    const daily = zeroFill(
      Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) })),
    );
    return {
      tenant_id: tenantId,
      daily,
      customers: customerRows,
      transactions: baskets.filter((basket) => basket.length >= 2).map((basket) => Array.from(new Set(basket))),
      horizon,
    };
  }
}
