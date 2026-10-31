import { BadRequestException, Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { PrismaService } from "../../prisma/prisma.service.js";

type RowError = { row: number; field: string; message: string };

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  parseFile(buffer: Buffer) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    return records;
  }

  previewProducts(tenantId: string, records: Record<string, string>[]) {
    const rows = records.map((record, index) => {
      const errors: RowError[] = [];
      const sku = (record.sku ?? "").trim();
      const name = (record.name ?? "").trim();
      const price = Number(record.price);
      if (!sku) errors.push({ row: index + 2, field: "sku", message: "SKU wajib" });
      if (!name) errors.push({ row: index + 2, field: "name", message: "Nama wajib" });
      if (!Number.isFinite(price) || price < 0) errors.push({ row: index + 2, field: "price", message: "Harga tidak valid" });
      return { row: index + 2, data: { sku, name, category: record.category?.trim() || null, price, cost: record.cost ? Number(record.cost) : null }, errors };
    });

    const seen = new Set<string>();
    for (const row of rows) {
      if (row.errors.length === 0) {
        if (seen.has(row.data.sku)) row.errors.push({ row: row.row, field: "sku", message: "Duplikat dalam file" });
        seen.add(row.data.sku);
      }
    }

    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid, rows };
  }

  previewCustomers(tenantId: string, records: Record<string, string>[]) {
    const rows = records.map((record, index) => {
      const errors: RowError[] = [];
      const externalRef = (record.externalRef ?? "").trim();
      const name = (record.name ?? "").trim();
      if (!externalRef) errors.push({ row: index + 2, field: "externalRef", message: "Referensi wajib" });
      if (!name) errors.push({ row: index + 2, field: "name", message: "Nama wajib" });
      return { row: index + 2, data: { externalRef, name, phone: record.phone?.trim() || null, email: record.email?.trim() || null }, errors };
    });

    const seen = new Set<string>();
    for (const row of rows) {
      if (row.errors.length === 0) {
        if (seen.has(row.data.externalRef)) row.errors.push({ row: row.row, field: "externalRef", message: "Duplikat dalam file" });
        seen.add(row.data.externalRef);
      }
    }

    const valid = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, valid, invalid: rows.length - valid, rows };
  }

  async commitProducts(tenantId: string, rows: { sku: string; name: string; category: string | null; price: number; cost: number | null }[]) {
    let inserted = 0;
    let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        try {
          await tx.product.create({ data: { tenantId, sku: row.sku, name: row.name, category: row.category, price: row.price.toFixed(2), cost: row.cost === null ? null : row.cost.toFixed(2) } });
          inserted += 1;
        } catch (error) {
          if ((error as { code?: string })?.code === "P2002") {
            skipped += 1;
          } else {
            throw error;
          }
        }
      }
    });
    return { inserted, skipped };
  }

  async commitCustomers(tenantId: string, rows: { externalRef: string; name: string; phone: string | null; email: string | null }[]) {
    let inserted = 0;
    let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        try {
          await tx.customer.create({ data: { tenantId, externalRef: row.externalRef, name: row.name, phone: row.phone, email: row.email } });
          inserted += 1;
        } catch (error) {
          if ((error as { code?: string })?.code === "P2002") {
            skipped += 1;
          } else {
            throw error;
          }
        }
      }
    });
    return { inserted, skipped };
  }
}
EOF
echo done