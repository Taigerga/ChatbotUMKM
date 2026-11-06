"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";

export type SeriesPoint = { date: string; value: number; baseline?: number; z_score?: number; is_anomaly?: boolean };

export function compactRupiah(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (Math.abs(value) >= 1_000) return `Rp${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return formatRupiah(value);
}

const axisStyle = { fontSize: 10 } as const;

export function DailySeriesChart({ data, height = 220 }: { data: SeriesPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
        <XAxis dataKey="date" tick={axisStyle} tickFormatter={(v: string) => v.slice(5)} minTickGap={40} />
        <YAxis tick={axisStyle} tickFormatter={(v: number) => compactRupiah(v)} width={70} />
        <Tooltip formatter={(value) => formatRupiah(Number(value))} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="value" name="Penjualan" stroke="#2563eb" dot={false} strokeWidth={1.5} />
        <Line
          type="monotone"
          dataKey="anomaly"
          name="Anomali"
          stroke="#dc2626"
          strokeWidth={0}
          dot={{ r: 4, fill: "#dc2626" }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ForecastChart({ data, height = 200 }: { data: { date: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
        <XAxis dataKey="date" tick={axisStyle} tickFormatter={(v: string) => v.slice(5)} minTickGap={20} />
        <YAxis tick={axisStyle} tickFormatter={(v: number) => compactRupiah(v)} width={70} />
        <Tooltip formatter={(value) => formatRupiah(Number(value))} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="value" name="Ramalan" stroke="#16a34a" dot={{ r: 2 }} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function withAnomalyFlags(series: SeriesPoint[]): (SeriesPoint & { anomaly: number | null })[] {
  return series.map((row) => ({ ...row, anomaly: row.is_anomaly ? row.value : null }));
}
