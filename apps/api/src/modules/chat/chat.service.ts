import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AiProviderService } from "../ai-provider/ai-provider.service.js";
import type { ChatTurn } from "../ai-provider/provider.interface.js";
import { CreateCustomerDto } from "../customers/dto/customer.dto.js";
import { CustomersService } from "../customers/customers.service.js";
import { CreateProductDto } from "../products/dto/product.dto.js";
import { ProductsService } from "../products/products.service.js";
import { CreateSaleDto } from "../sales/dto/create-sale.dto.js";
import { calculateTotals } from "../sales/sale-calculator.js";
import { SalesService } from "../sales/sales.service.js";
import { ChatReadTools } from "./chat-read-tools.js";
import { SendMessageDto } from "./dto/send-message.dto.js";
import { READ_TOOLS, SYSTEM_PROMPT, TOOL_SPECS, WRITE_TOOLS } from "./tools.js";

const ACTION_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProviderService,
    private readonly readTools: ChatReadTools,
    private readonly sales: SalesService,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
  ) {}

  async send(tenantId: string, userId: string, dto: SendMessageDto) {
    const conversation = dto.conversationId
      ? await this.prisma.chatConversation.findFirst({ where: { id: dto.conversationId, tenantId, userId } })
      : await this.prisma.chatConversation.create({ data: { tenantId, userId, title: dto.message.slice(0, 60) } });
    if (!conversation) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });

    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "user", content: dto.message } });
    const turns = await this.loadTurns(conversation.id);

    for (let loop = 0; loop < 5; loop++) {
      const completion = await this.provider.complete({ system: SYSTEM_PROMPT, messages: turns, tools: TOOL_SPECS });
      const write = completion.toolCalls.find((call) => WRITE_TOOLS.has(call.name));
      if (write) return this.propose(tenantId, conversation.id, write.name, write.arguments, completion.text);

      const reads = completion.toolCalls.filter((call) => READ_TOOLS.has(call.name));
      if (reads.length === 0) {
        const reply = completion.text ?? "Maaf, saya belum bisa memproses permintaan itu.";
        await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });
        return { conversationId: conversation.id, reply };
      }

      for (const call of reads.slice(0, 5)) {
        const observation = await this.runRead(tenantId, call.name, call.arguments);
        turns.push({ role: "assistant", content: `Hasil ${call.name}: ${JSON.stringify(observation)}` });
        await this.prisma.chatMessage.create({
          data: { conversationId: conversation.id, role: "tool", content: JSON.stringify(observation), toolName: call.name },
        });
      }
    }

    const reply = "Saya butuh informasi tambahan yang lebih spesifik. Bisa dijelaskan ulang?";
    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } });
    return { conversationId: conversation.id, reply };
  }

  async confirm(tenantId: string, userId: string, actionId: string) {
    const action = await this.prisma.pendingAction.findFirst({ where: { id: actionId, tenantId } });
    if (!action) throw new NotFoundException({ code: "ACTION_NOT_FOUND", message: "Aksi tidak ditemukan" });

    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: action.conversationId, tenantId, userId },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException({ code: "ACTION_NOT_FOUND", message: "Aksi tidak ditemukan" });

    if (action.status === "executed") return { status: "executed", result: action.result };
    if (action.status === "cancelled") throw new ConflictException({ code: "ACTION_CANCELLED", message: "Aksi sudah dibatalkan" });
    if (action.status !== "proposed") throw new ConflictException({ code: "ACTION_NOT_PENDING", message: "Aksi tidak bisa dikonfirmasi" });
    if (action.expiresAt.getTime() < Date.now()) {
      throw new ConflictException({ code: "ACTION_EXPIRED", message: "Aksi sudah kedaluwarsa, minta ulang" });
    }

    const payload = (action.payload ?? {}) as Record<string, unknown>;
    let result: unknown;

    if (action.tool === "createSale" || action.tool === "updateSale") {
      const salePayload = action.tool === "updateSale"
        ? { occurredAt: payload.occurredAt, items: payload.items, discount: payload.discount, tax: payload.tax, notes: payload.notes }
        : payload;
      const dto = plainToInstance(CreateSaleDto, normalizeSaleArgs(salePayload));
      const problems = await validate(dto, { whitelist: true });
      if (problems.length > 0) throw new BadRequestException({ code: "SALE_INVALID", message: "Data aksi tidak valid" });
      const businessErrors = this.sales.validate(dto);
      if (businessErrors.length > 0) throw new BadRequestException({ code: "SALE_INVALID", message: businessErrors.join("; "), details: businessErrors });

      if (action.tool === "createSale") {
        const sale = await this.sales.create(tenantId, userId, dto, { idempotencyKey: action.id, source: "chat" });
        result = { saleId: sale.id, total: Number(sale.total).toFixed(2) };
      } else {
        const saleId = String(payload.saleId);
        const sale = await this.sales.update(tenantId, userId, saleId, dto);
        result = { saleId: sale.id, total: Number(sale.total).toFixed(2) };
      }
    } else if (action.tool === "createProduct") {
      const dto = plainToInstance(CreateProductDto, payload);
      const problems = await validate(dto, { whitelist: true });
      if (problems.length > 0) throw new BadRequestException({ code: "PRODUCT_INVALID", message: "Data produk tidak valid" });
      const product = await this.products.create(tenantId, dto);
      result = { productId: product.id, sku: product.sku, name: product.name };
    } else if (action.tool === "createCustomer") {
      const dto = plainToInstance(CreateCustomerDto, payload);
      const problems = await validate(dto, { whitelist: true });
      if (problems.length > 0) throw new BadRequestException({ code: "CUSTOMER_INVALID", message: "Data pelanggan tidak valid" });
      const customer = await this.customers.create(tenantId, dto);
      result = { customerId: customer.id, externalRef: customer.externalRef, name: customer.name };
    } else if (action.tool === "deleteSale") {
      const saleId = String(payload.saleId);
      await this.sales.remove(tenantId, userId, saleId);
      result = { saleId };
    } else {
      throw new BadRequestException({ code: "ACTION_UNKNOWN", message: "Jenis aksi tidak dikenal" });
    }

    const updated = await this.prisma.pendingAction.updateMany({
      where: { id: action.id, tenantId, status: "proposed" },
      data: { status: "executed", executedAt: new Date(), result: result as any },
    });
    if (updated.count === 0) {
      const latest = await this.prisma.pendingAction.findUnique({ where: { id: action.id } });
      if (latest?.status === "executed" && latest.result) {
        return { status: "executed", result: latest.result };
      }
      throw new ConflictException({ code: "ACTION_NOT_PENDING", message: "Aksi tidak bisa dikonfirmasi" });
    }
    return { status: "executed", result };
  }

  async cancel(tenantId: string, userId: string, actionId: string) {
    const action = await this.prisma.pendingAction.findFirst({ where: { id: actionId, tenantId } });
    if (!action) throw new NotFoundException({ code: "ACTION_NOT_FOUND", message: "Aksi tidak ditemukan" });

    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: action.conversationId, tenantId, userId },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException({ code: "ACTION_NOT_FOUND", message: "Aksi tidak ditemukan" });

    if (action.status === "executed") throw new ConflictException({ code: "ACTION_EXECUTED", message: "Aksi sudah dijalankan" });
    await this.prisma.pendingAction.update({ where: { id: action.id }, data: { status: "cancelled" } });
    return { status: "cancelled" };
  }

  private async loadTurns(conversationId: string): Promise<ChatTurn[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return messages.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  private async runRead(tenantId: string, name: string, args: Record<string, unknown>) {
    if (name === "getSalesSummary") return this.readTools.getSalesSummary(tenantId, { from: String(args.from ?? ""), to: String(args.to ?? "") });
    if (name === "findProducts") return this.readTools.findProducts(tenantId, { query: String(args.query ?? "") });
    if (name === "findCustomers") return this.readTools.findCustomers(tenantId, { query: String(args.query ?? "") });
    if (name === "topProducts") return this.readTools.topProducts(tenantId, { from: String(args.from ?? ""), to: String(args.to ?? ""), limit: args.limit ? Number(args.limit) : undefined });
    if (name === "topCustomers") return this.readTools.topCustomers(tenantId, { from: String(args.from ?? ""), to: String(args.to ?? ""), limit: args.limit ? Number(args.limit) : undefined });
    if (name === "forecastSales") return this.readTools.forecastSales({ horizon: args.horizon ? Number(args.horizon) : undefined });
    if (name === "rfmSegments") return this.readTools.rfmSegments(tenantId);
    if (name === "churnRisk") return this.readTools.churnRisk(tenantId);
    if (name === "anomalyDetection") return this.readTools.anomalyDetection(tenantId);
    if (name === "marketBasket") return this.readTools.marketBasket({ basket: Array.isArray(args.basket) ? args.basket.map(String) : [] });
    return { error: `Tool ${name} tidak tersedia` };
  }

  private async propose(tenantId: string, conversationId: string, tool: string, args: Record<string, unknown>, text?: string) {
    if (tool === "createSale") {
      const payload = plainToInstance(CreateSaleDto, normalizeSaleArgs(args));
      const problems = await validate(payload, { whitelist: true });
      if (problems.length > 0) {
        const reply = "Data penjualan belum lengkap. Sebutkan tanggal, item, jumlah, dan harga satuannya.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const businessErrors = this.sales.validate(payload);
      if (businessErrors.length > 0) {
        const reply = `Data belum bisa dicatat: ${businessErrors.join("; ")}. Mohon perbaiki.`;
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const totals = calculateTotals(payload.items, payload.discount, payload.tax);
      const preview = {
        occurredAt: payload.occurredAt,
        items: payload.items.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (item.unitPrice * item.qty).toFixed(2),
        })),
        itemCount: payload.items.reduce((sum, item) => sum + item.qty, 0),
        subtotal: totals.subtotal,
        discount: (payload.discount ?? 0).toFixed(2),
        tax: (payload.tax ?? 0).toFixed(2),
        total: totals.total,
        source: "chat",
      };
      return this.createAction(tenantId, conversationId, tool, { occurredAt: payload.occurredAt, items: payload.items, discount: payload.discount ?? 0, tax: payload.tax ?? 0, notes: payload.notes }, preview, text);
    }

    if (tool === "createProduct") {
      const payload = plainToInstance(CreateProductDto, args);
      const problems = await validate(payload, { whitelist: true });
      if (problems.length > 0) {
        const reply = "Data produk belum lengkap. Sebutkan SKU, nama, dan harga.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const preview = {
        sku: payload.sku,
        name: payload.name,
        category: payload.category ?? null,
        price: Number(payload.price).toFixed(2),
        cost: payload.cost === undefined ? null : Number(payload.cost).toFixed(2),
      };
      return this.createAction(tenantId, conversationId, tool, { sku: payload.sku, name: payload.name, category: payload.category, price: payload.price, cost: payload.cost }, preview, text);
    }

    if (tool === "createCustomer") {
      const payload = plainToInstance(CreateCustomerDto, args);
      const problems = await validate(payload, { whitelist: true });
      if (problems.length > 0) {
        const reply = "Data pelanggan belum lengkap. Sebutkan referensi dan nama.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const preview = {
        externalRef: payload.externalRef,
        name: payload.name,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
      };
      return this.createAction(tenantId, conversationId, tool, { externalRef: payload.externalRef, name: payload.name, phone: payload.phone, email: payload.email }, preview, text);
    }

    if (tool === "updateSale") {
      const saleId = String(args.saleId ?? "");
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, include: { items: true } });
      if (!sale) {
        const reply = "Penjualan tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const payload = plainToInstance(CreateSaleDto, normalizeSaleArgs(args));
      const problems = await validate(payload, { whitelist: true });
      if (problems.length > 0) {
        const reply = "Data penjualan belum lengkap. Sebutkan tanggal, item, jumlah, dan harga satuannya.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const businessErrors = this.sales.validate(payload);
      if (businessErrors.length > 0) {
        const reply = `Data belum bisa diubah: ${businessErrors.join("; ")}. Mohon perbaiki.`;
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const totals = calculateTotals(payload.items, payload.discount, payload.tax);
      const preview = {
        saleId,
        beforeTotal: Number(sale.total).toFixed(2),
        occurredAt: payload.occurredAt,
        items: payload.items.map((item) => ({ description: item.description, qty: item.qty, unitPrice: item.unitPrice.toFixed(2), lineTotal: (item.unitPrice * item.qty).toFixed(2) })),
        itemCount: payload.items.reduce((sum, item) => sum + item.qty, 0),
        subtotal: totals.subtotal,
        discount: (payload.discount ?? 0).toFixed(2),
        tax: (payload.tax ?? 0).toFixed(2),
        total: totals.total,
        source: "chat",
      };
      return this.createAction(tenantId, conversationId, tool, { saleId, occurredAt: payload.occurredAt, items: payload.items, discount: payload.discount ?? 0, tax: payload.tax ?? 0, notes: payload.notes }, preview, text);
    }

    if (tool === "deleteSale") {
      const saleId = String(args.saleId ?? "");
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, include: { items: true } });
      if (!sale) {
        const reply = "Penjualan tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const preview = {
        saleId,
        occurredAt: sale.occurredAt,
        itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
        total: Number(sale.total).toFixed(2),
        warning: "Penjualan akan dihapus permanen.",
      };
      return this.createAction(tenantId, conversationId, tool, { saleId }, preview, text);
    }

    const reply = "Aksi tidak dikenal.";
    await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
    return { conversationId, reply };
  }

  private async createAction(tenantId: string, conversationId: string, tool: string, payload: Record<string, unknown>, preview: unknown, text?: string) {
    const reply = text?.trim() || "Saya sudah menyiapkan ringkasan. Periksa lalu setujui untuk menyimpan.";
    const action = await this.prisma.pendingAction.create({
      data: {
        tenantId,
        conversationId,
        tool,
        payload: payload as any,
        preview: preview as any,
        expiresAt: new Date(Date.now() + ACTION_TTL_MS),
        idempotencyKey: randomUUID(),
      },
    });
    await this.prisma.chatMessage.create({
      data: { conversationId, role: "assistant", content: reply, toolName: tool, toolResult: preview as any },
    });
    return { conversationId, reply, action: { id: action.id, tool, preview, expiresAt: action.expiresAt } };
  }
}

function normalizeSaleArgs(args: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(args.items)
    ? (args.items as Record<string, unknown>[]).map((item) => ({
        ...item,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      }))
    : [];
  return {
    occurredAt: args.occurredAt,
    items,
    discount: args.discount === undefined ? undefined : Number(args.discount),
    tax: args.tax === undefined ? undefined : Number(args.tax),
    notes: args.notes,
  };
}
