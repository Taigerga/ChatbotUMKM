import { BadRequestException, Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../../prisma/prisma.service.js";
import { CreateCustomerDto } from "../customers/dto/customer.dto.js";
import { CustomersService } from "../customers/customers.service.js";
import { CreateProductDto } from "../products/dto/product.dto.js";
import { ProductsService } from "../products/products.service.js";
import { CreateSaleDto } from "../sales/dto/create-sale.dto.js";
import { SalesService } from "../sales/sales.service.js";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

type RowError = { field: string; message: string };
type ParsedRow = { row: number; data: Record<string, any>; errors: RowError[]; warnings: string[] };

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 20000;

const SYNONYMS: Record<string, Record<string, string[]>> = {
  products: {
    sku: ["sku", "kode", "code", "kodeproduk"],
    name: ["name", "nama", "product", "produk", "namaproduk"],
    category: ["category", "kategori"],
    price: ["price", "harga", "hargasatuan"],
    cost: ["cost", "biaya", "hpp", "modal"],
  },
  customers: {
    externalRef: ["externalref", "ref", "referensi", "id", "kode"],
    name: ["name", "nama", "customer", "pelanggan"],
    phone: ["phone", "telepon", "hp", "nohp"],
    email: ["email", "mail"],
  },
  sales: {
    date: ["date", "tanggal", "order_date", "occurredat", "tgl"],
    time: ["time", "jam", "waktu"],
    orderKey: ["order_id", "orderid", "no_pesanan", "invoice", "nopemesanan"],
    product: ["product", "produk", "name", "nama", "description", "deskripsi", "item", "namaproduk"],
    sku: ["sku", "kode", "kodeproduk"],
    qty: ["qty", "jumlah", "quantity", "kuantitas"],
    unitPrice: ["unit_price", "harga", "price", "hargasatuan", "hargajual"],
    discount: ["discount", "diskon"],
    tax: ["tax", "pajak"],
    customer: ["customer", "pelanggan", "customer_name", "namapelanggan", "customer_id", "idpelanggan"],
    notes: ["notes", "catatan", "keterangan"],
  },
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly sales: SalesService,
  ) {}

  parseFile(buffer: Buffer, filename: string): { headers: string[]; records: Record<string, string>[] } {
    if (buffer.length > MAX_BYTES) throw new BadRequestException({ code: "FILE_TOO_LARGE", message: "File melebihi 5MB" });
    const isXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (isXlsx) {
      const workbook = new (ExcelJS as any).Workbook();
      // synchronous-ish: load via buffer returns promise; handle below
      throw new BadRequestException({ code: "XLSX_ASYNC", message: "Gunakan endpoint preview (async)" });
    }
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Record<string, string>[];
    if (records.length > MAX_ROWS) throw new BadRequestException({ code: "TOO_MANY_ROWS", message: `Maksimal ${MAX_ROWS} baris` });
    const headers = records.length ? Object.keys(records[0]) : [];
    return { headers, records };
  }

  async parseFileAsync(buffer: Buffer, filename: string): Promise<{ headers: string[]; records: Record<string, string>[] }> {
    if (buffer.length > MAX_BYTES) throw new BadRequestException({ code: "FILE_TOO_LARGE", message: "File melebihi 5MB" });
    const isXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (isXlsx) {
      const workbook = new (ExcelJS as any).Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new BadRequestException({ code: "EMPTY_SHEET", message: "Sheet kosong" });
      const headers: string[] = [];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell: any, col: number) => {
        headers[col - 1] = String(cell.value ?? "").trim();
      });
      const records: Record<string, string>[] = [];
      sheet.eachRow((row: any, rowNum: number) => {
        if (rowNum === 1) return;
        const rec: Record<string, string> = {};
        let hasValue = false;
        row.eachCell((cell: any, col: number) => {
          const key = headers[col - 1];
          if (!key) return;
          const val = cell.value;
          const str = val === null || val === undefined ? "" : (typeof val === "object" && "text" in val ? String((val as any).text) : String(val));
          rec[key] = str.trim();
          if (str.trim()) hasValue = true;
        });
        if (hasValue) records.push(rec);
      });
      if (records.length > MAX_ROWS) throw new BadRequestException({ code: "TOO_MANY_ROWS", message: `Maksimal ${MAX_ROWS} baris` });
      return { headers, records };
    }
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true }) as Record<string, string>[];
    if (records.length > MAX_ROWS) throw new BadRequestException({ code: "TOO_MANY_ROWS", message: `Maksimal ${MAX_ROWS} baris` });
    const headers = records.length ? Object.keys(records[0]) : [];
    return { headers, records };
  }

  autoMap(headers: string[], entity: string): Record<string, string | null> {
    const syn = SYNONYMS[entity] ?? {};
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const result: Record<string, string | null> = {};
    for (const field of Object.keys(syn)) {
      const found = headers.find((h) => {
        const nh = norm(h);
        return (syn[field] as string[]).some((s) => nh === norm(s) || nh.includes(norm(s)));
      });
      result[field] = found ?? null;
    }
    return result;
  }

  private mappedValue(record: Record<string, string>, mapping: Record<string, string | null>, field: string): string {
    const col = mapping[field];
    if (!col) return "";
    return (record[col] ?? "").trim();
  }

  previewProducts(tenantId: string, records: Record<string, string>[], mapping: Record<string, string | null>): ParsedRow[] {
    const rows = records.map((record, index) => {
      const errors: RowError[] = [];
      const warnings: string[] = [];
      const sku = this.mappedValue(record, mapping, "sku");
      const name = this.mappedValue(record, mapping, "name");
      const price = Number(this.mappedValue(record, mapping, "price"));
      const category = this.mappedValue(record, mapping, "category") || null;
      const costRaw = this.mappedValue(record, mapping, "cost");
      const cost = costRaw ? Number(costRaw) : null;
      if (!sku) errors.push({ field: "sku", message: "SKU wajib" });
      if (!name) errors.push({ field: "name", message: "Nama wajib" });
      if (!Number.isFinite(price) || price < 0) errors.push({ field: "price", message: "Harga tidak valid" });
      if (cost !== null && !Number.isFinite(cost)) errors.push({ field: "cost", message: "Biaya tidak valid" });
      return { row: index + 2, data: { sku, name, category, price, cost }, errors, warnings };
    });
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.errors.length === 0) {
        if (seen.has(row.data.sku)) row.errors.push({ field: "sku", message: "Duplikat dalam file" });
        seen.add(row.data.sku);
      }
    }
    return rows;
  }

  previewCustomers(tenantId: string, records: Record<string, string>[], mapping: Record<string, string | null>): ParsedRow[] {
    const rows = records.map((record, index) => {
      const errors: RowError[] = [];
      const warnings: string[] = [];
      const externalRef = this.mappedValue(record, mapping, "externalRef");
      const name = this.mappedValue(record, mapping, "name");
      const phone = this.mappedValue(record, mapping, "phone") || null;
      const email = this.mappedValue(record, mapping, "email") || null;
      if (!externalRef) errors.push({ field: "externalRef", message: "Referensi wajib" });
      if (!name) errors.push({ field: "name", message: "Nama wajib" });
      return { row: index + 2, data: { externalRef, name, phone, email }, errors, warnings };
    });
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.errors.length === 0) {
        if (seen.has(row.data.externalRef)) row.errors.push({ field: "externalRef", message: "Duplikat dalam file" });
        seen.add(row.data.externalRef);
      }
    }
    return rows;
  }

  async previewSales(tenantId: string, records: Record<string, string>[], mapping: Record<string, string | null>, createMissing: boolean): Promise<ParsedRow[]> {
    const rows = records.map((record, index) => {
      const errors: RowError[] = [];
      const warnings: string[] = [];
      const dateRaw = this.mappedValue(record, mapping, "date");
      const timeRaw = this.mappedValue(record, mapping, "time");
      const occurredAt = this.parseDate(dateRaw, timeRaw);
      if (!dateRaw || !occurredAt) errors.push({ field: "date", message: "Tanggal tidak valid" });

      const productRaw = this.mappedValue(record, mapping, "product");
      const sku = this.mappedValue(record, mapping, "sku");
      const productName = productRaw || sku;
      if (!productName) errors.push({ field: "product", message: "Produk wajib" });

      const qty = Number(this.mappedValue(record, mapping, "qty"));
      if (!Number.isInteger(qty) || qty < 1) errors.push({ field: "qty", message: "Qty harus bilangan bulat >= 1" });

      const unitPrice = Number(this.mappedValue(record, mapping, "unitPrice"));
      if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push({ field: "unitPrice", message: "Harga satuan tidak valid" });

      const discount = this.mappedValue(record, mapping, "discount") ? Number(this.mappedValue(record, mapping, "discount")) : 0;
      const tax = this.mappedValue(record, mapping, "tax") ? Number(this.mappedValue(record, mapping, "tax")) : 0;
      if (!Number.isFinite(discount) || discount < 0) errors.push({ field: "discount", message: "Diskon tidak valid" });
      if (!Number.isFinite(tax) || tax < 0) errors.push({ field: "tax", message: "Pajak tidak valid" });

      const customerRaw = this.mappedValue(record, mapping, "customer");
      const orderKey = this.mappedValue(record, mapping, "orderKey");
      const notes = this.mappedValue(record, mapping, "notes") || null;

      const data: Record<string, any> = {
        occurredAt: occurredAt ? occurredAt.toISOString() : null,
        orderKey: orderKey || null,
        productName: productName || null,
        sku: sku || null,
        qty,
        unitPrice,
        discount,
        tax,
        customerRaw: customerRaw || null,
        notes,
      };
      return { row: index + 2, data, errors, warnings };
    });

    // resolve products/customers (warnings/errors)
    for (const row of rows) {
      if (row.errors.length > 0) continue;
      const sku = row.data.sku;
      const name = row.data.productName;
      // product resolution
      let product = null;
      if (sku) product = await this.prisma.product.findFirst({ where: { tenantId, sku } });
      if (!product && name) product = await this.prisma.product.findFirst({ where: { tenantId, name } });
      if (!product) {
        if (createMissing) {
          row.data.createProduct = { sku: sku || this.slug(name), name: name || sku, price: row.data.unitPrice };
          row.warnings.push("Produk baru akan dibuat");
        } else {
          row.errors.push({ field: "product", message: "Produk tidak ditemukan (aktifkan buat otomatis)" });
        }
      } else {
        row.data.productId = product.id;
      }

      // customer resolution (optional)
      if (row.data.customerRaw) {
        let customer = await this.prisma.customer.findFirst({ where: { tenantId, externalRef: row.data.customerRaw } });
        if (!customer) customer = await this.prisma.customer.findFirst({ where: { tenantId, name: row.data.customerRaw } });
        if (!customer) {
          if (createMissing) {
            row.data.createCustomer = { externalRef: row.data.customerRaw, name: row.data.customerRaw };
            row.warnings.push("Pelanggan baru akan dibuat");
          } else {
            row.errors.push({ field: "customer", message: "Pelanggan tidak ditemukan (aktifkan buat otomatis)" });
          }
        } else {
          row.data.customerId = customer.id;
        }
      }
    }

    // duplicate within file (same order+product)
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.errors.length === 0) {
        const key = `${row.data.orderKey ?? row.row}:${row.data.productName ?? row.data.sku}`;
        if (seen.has(key)) row.errors.push({ field: "product", message: "Duplikat dalam file" });
        seen.add(key);
      }
    }

    return rows;
  }

  private parseDate(dateRaw: string, timeRaw: string): Date | null {
    if (!dateRaw) return null;
    const d = dateRaw.trim();
    // support YYYY-MM-DD or DD/MM/YYYY
    let iso = d;
    const m = d.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    const time = timeRaw ? (timeRaw.includes(":") ? timeRaw : `${timeRaw}:00`) : "00:00";
    const dt = new Date(`${iso}T${time}:00.000Z`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  private slug(s: string): string {
    return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produk";
  }

  async createJob(tenantId: string, userId: string, filename: string, entity: string, headers: string[], records: Record<string, string>[], mapping: Record<string, string | null>, rows: ParsedRow[]): Promise<string> {
    const job = await this.prisma.importJob.create({
      data: {
        tenantId,
        userId,
        filename,
        entity,
        status: "preview",
        mapping: mapping as any,
        rows: records as any,
        rowCount: records.length,
        validCount: rows.filter((r) => r.errors.length === 0).length,
        errorCount: rows.filter((r) => r.errors.length > 0).length,
      },
    });
    return job.id;
  }

  async preview(tenantId: string, userId: string, entity: string, buffer: Buffer, filename: string, mappingOverride?: Record<string, string | null>, createMissing = false) {
    if (!["products", "customers", "sales"].includes(entity)) throw new BadRequestException({ code: "ENTITY_UNKNOWN", message: "Jenis data tidak dikenal" });
    const { headers, records } = await this.parseFileAsync(buffer, filename);
    const mapping = mappingOverride && Object.keys(mappingOverride).length ? mappingOverride : this.autoMap(headers, entity);
    let rows: ParsedRow[];
    if (entity === "products") rows = this.previewProducts(tenantId, records, mapping);
    else if (entity === "customers") rows = this.previewCustomers(tenantId, records, mapping);
    else rows = await this.previewSales(tenantId, records, mapping, createMissing);

    const jobId = await this.createJob(tenantId, userId, filename, entity, headers, records, mapping, rows);
    return {
      jobId,
      entity,
      headers,
      mapping,
      total: records.length,
      valid: rows.filter((r) => r.errors.length === 0).length,
      invalid: rows.filter((r) => r.errors.length > 0).length,
      rows: rows.slice(0, 100),
    };
  }

  private async commitProducts(tenantId: string, userId: string, rows: ParsedRow[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0; let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.errors.length) continue;
        try {
          await tx.product.create({ data: { tenantId, sku: row.data.sku, name: row.data.name, category: row.data.category, price: row.data.price.toFixed(2), cost: row.data.cost === null ? null : row.data.cost.toFixed(2) } });
          inserted += 1;
        } catch (error) {
          if ((error as { code?: string })?.code === "P2002") skipped += 1; else throw error;
        }
      }
    });
    await this.prisma.auditLog.create({ data: { tenantId, userId, action: "import.products", entity: "Product", entityId: "batch", summary: { inserted, skipped } } });
    return { inserted, skipped };
  }

  private async commitCustomers(tenantId: string, userId: string, rows: ParsedRow[]): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0; let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (row.errors.length) continue;
        try {
          await tx.customer.create({ data: { tenantId, externalRef: row.data.externalRef, name: row.data.name, phone: row.data.phone, email: row.data.email } });
          inserted += 1;
        } catch (error) {
          if ((error as { code?: string })?.code === "P2002") skipped += 1; else throw error;
        }
      }
    });
    await this.prisma.auditLog.create({ data: { tenantId, userId, action: "import.customers", entity: "Customer", entityId: "batch", summary: { inserted, skipped } } });
    return { inserted, skipped };
  }

  private async commitSales(tenantId: string, userId: string, jobId: string, rows: ParsedRow[], createMissing: boolean): Promise<{ inserted: number; skipped: number; errors: string[] }> {
    const validRows = rows.filter((r) => r.errors.length === 0);
    // group by orderKey
    const groups = new Map<string, ParsedRow[]>();
    let idx = 0;
    for (const row of validRows) {
      const key = row.data.orderKey || `row-${row.row}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    let inserted = 0; let skipped = 0; const errors: string[] = [];
    for (const [key, group] of groups) {
      // ensure products/customers
      const itemRows = group;
      const customerId = itemRows[0].data.customerId ?? null;
      // create missing customer
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && createMissing && itemRows[0].data.createCustomer) {
        try {
          const c = await this.customers.create(tenantId, plainToInstance(CreateCustomerDto, itemRows[0].data.createCustomer));
          resolvedCustomerId = c.id;
        } catch (e) {
          errors.push(`Pelanggan baru gagal: ${(e as Error).message}`);
          continue;
        }
      }
      // create missing products map
      const productIdByRow = new Map<number, string>();
      for (const row of itemRows) {
        if (row.data.productId) { productIdByRow.set(row.row, row.data.productId); continue; }
        if (createMissing && row.data.createProduct) {
          try {
            const p = await this.products.create(tenantId, plainToInstance(CreateProductDto, row.data.createProduct));
            productIdByRow.set(row.row, p.id);
          } catch (e) {
            errors.push(`Produk baru gagal baris ${row.row}: ${(e as Error).message}`);
          }
        }
      }
      if (errors.length && errors[errors.length - 1].includes("gagal")) {
        // skip this group if any product failed
      }

      const items = itemRows.map((row) => ({
        productId: productIdByRow.get(row.row) ?? row.data.productId ?? undefined,
        description: row.data.productName ?? row.data.sku ?? "Item",
        qty: row.data.qty,
        unitPrice: row.data.unitPrice,
      }));
      // if any missing product not resolved, skip group
      if (itemRows.some((row) => !row.data.productId && !(createMissing && row.data.createProduct) )) {
        // already errored or not
      }

      const dto = plainToInstance(CreateSaleDto, {
        occurredAt: itemRows[0].data.occurredAt,
        customerId: resolvedCustomerId ?? undefined,
        notes: itemRows[0].data.notes ?? undefined,
        discount: itemRows[0].data.discount,
        tax: itemRows[0].data.tax,
        items,
      });
      const problems = await validate(dto, { whitelist: true });
      if (problems.length > 0) {
        errors.push(`Grup ${key}: ${problems.map((p) => Object.values(p.constraints ?? {}).join(", ")).join("; ")}`);
        continue;
      }
      const biz = this.sales.validate(dto);
      if (biz.length > 0) {
        errors.push(`Grup ${key}: ${biz.join("; ")}`);
        continue;
      }
      try {
        await this.sales.create(tenantId, userId, dto, { idempotencyKey: `import:${jobId}:${idx++}`, source: "import" });
        inserted += 1;
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "P2002") skipped += 1;
        else errors.push(`Grup ${key}: ${(e as Error).message}`);
      }
    }
    await this.prisma.auditLog.create({ data: { tenantId, userId, action: "import.sales", entity: "Sale", entityId: "batch", summary: { inserted, skipped, errors: errors.length } } });
    return { inserted, skipped, errors };
  }

  async confirm(tenantId: string, userId: string, jobId: string, mappingOverride?: Record<string, string | null>, createMissing = false) {
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, tenantId } });
    if (!job) throw new BadRequestException({ code: "JOB_NOT_FOUND", message: "Job impor tidak ditemukan" });
    if (job.status === "committed") throw new BadRequestException({ code: "JOB_COMMITTED", message: "Job sudah dikonfirmasi" });

    const records = (job.rows as Record<string, string>[]) ?? [];
    const mapping = mappingOverride && Object.keys(mappingOverride).length ? mappingOverride : ((job.mapping as Record<string, string | null>) ?? {});
    const entity = job.entity;

    let rows: ParsedRow[];
    if (entity === "products") rows = this.previewProducts(tenantId, records, mapping);
    else if (entity === "customers") rows = this.previewCustomers(tenantId, records, mapping);
    else rows = await this.previewSales(tenantId, records, mapping, createMissing);

    let result: any;
    if (entity === "products") result = await this.commitProducts(tenantId, userId, rows);
    else if (entity === "customers") result = await this.commitCustomers(tenantId, userId, rows);
    else result = await this.commitSales(tenantId, userId, jobId, rows, createMissing);

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "committed",
        mapping: mapping as any,
        validCount: rows.filter((r) => r.errors.length === 0).length,
        errorCount: rows.filter((r) => r.errors.length > 0).length,
        report: { result, rowErrors: rows.filter((r) => r.errors.length).map((r) => ({ row: r.row, errors: r.errors })) } as any,
      },
    });

    return { jobId, entity, ...result };
  }

  async listJobs(tenantId: string, limit = 20, offset = 0) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max(offset, 0);
    const [items, total] = await Promise.all([
      this.prisma.importJob.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take, skip }),
      this.prisma.importJob.count({ where: { tenantId } }),
    ]);
    return { items, total, limit: take, offset: skip };
  }

  async getJob(tenantId: string, id: string) {
    const job = await this.prisma.importJob.findFirst({ where: { id, tenantId } });
    if (!job) throw new BadRequestException({ code: "JOB_NOT_FOUND", message: "Job impor tidak ditemukan" });
    return job;
  }

  template(entity: string): string {
    if (entity === "products") return "sku,name,category,price,cost\nSKU001,Kopi Susu,Minuman,15000,8000\n";
    if (entity === "customers") return "externalRef,name,phone,email\nC001,Budi,08123456789,budi@mail.com\n";
    if (entity === "sales") return "date,time,order_id,product,sku,qty,unit_price,discount,tax,customer,notes\n2026-11-01,10:00,ORD001,Kopi Susu,SKU001,2,15000,0,0,Budi,\n";
    throw new BadRequestException({ code: "ENTITY_UNKNOWN", message: "Jenis data tidak dikenal" });
  }
}
