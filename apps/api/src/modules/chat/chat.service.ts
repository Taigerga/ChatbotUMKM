import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AiConfigService } from "../ai-config/ai-config.service.js";
import { AiProviderService } from "../ai-provider/ai-provider.service.js";
import type { AiProvider, ChatTurn, CompletionRequest, CompletionResult } from "../ai-provider/provider.interface.js";
import { ProviderError } from "../ai-provider/provider.interface.js";
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
    private readonly aiConfig: AiConfigService,
    private readonly readTools: ChatReadTools,
    private readonly sales: SalesService,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
  ) {}

  async send(tenantId: string, userId: string, dto: SendMessageDto, aiMode: "default" | "personal" = "default") {
    const conversation = dto.conversationId
      ? await this.prisma.chatConversation.findFirst({ where: { id: dto.conversationId, tenantId, userId } })
      : await this.prisma.chatConversation.create({ data: { tenantId, userId, title: dto.message.slice(0, 60) } });
    if (!conversation) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });

    const completer = await this.resolveCompleter(userId, aiMode);

    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "user", content: dto.message } });
    const turns = await this.loadTurns(conversation.id);

    for (let loop = 0; loop < 5; loop++) {
      const completion = await this.completeWithFriendlyError(completer, { system: SYSTEM_PROMPT, messages: turns, tools: TOOL_SPECS });
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

  private async resolveCompleter(userId: string, aiMode: "default" | "personal"): Promise<{ complete(request: CompletionRequest): Promise<CompletionResult> }> {
    if (aiMode === "default") return this.provider;
    const provider = await this.aiConfig.getProviderForUser(userId);
    if (!provider) {
      throw new BadRequestException({ code: "AI_CONFIG_MISSING", message: "AI pribadi belum dikonfigurasi. Buka Pengaturan → AI Pribadi." });
    }
    return provider;
  }

  private async completeWithFriendlyError(completer: { complete(request: CompletionRequest): Promise<CompletionResult> }, request: CompletionRequest) {
    try {
      return await completer.complete(request);
    } catch (error) {
      if (error instanceof ProviderError) {
        if (error.code === "BAD_REQUEST") {
          throw new BadRequestException({ code: "AI_BAD_REQUEST", message: error.message });
        }
        if (error.code === "AUTH") {
          throw new BadRequestException({ code: "AI_AUTH", message: "API Key tidak valid atau tidak memiliki akses" });
        }
        throw new ServiceUnavailableException({ code: "AI_UNAVAILABLE", message: error.message });
      }
      throw error;
    }
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
      // resolve/create missing customer
      let customerId = payload.customerId ? String(payload.customerId) : undefined;
      if (!customerId && payload.createCustomer) {
        const customerDto = plainToInstance(CreateCustomerDto, payload.createCustomer as Record<string, unknown>);
        const customerProblems = await validate(customerDto, { whitelist: true });
        if (customerProblems.length > 0) throw new BadRequestException({ code: "CUSTOMER_INVALID", message: "Data pelanggan baru tidak valid" });
        const createdCustomer = await this.customers.create(tenantId, customerDto);
        customerId = createdCustomer.id;
      }

      // resolve/create missing products per item
      const rawItems = Array.isArray(payload.items) ? (payload.items as Record<string, unknown>[]) : [];
      const resolvedItems: Record<string, unknown>[] = [];
      for (const item of rawItems) {
        let productId = item.productId ? String(item.productId) : undefined;
        if (!productId && item.createProduct) {
          const productDto = plainToInstance(CreateProductDto, item.createProduct as Record<string, unknown>);
          const productProblems = await validate(productDto, { whitelist: true });
          if (productProblems.length > 0) throw new BadRequestException({ code: "PRODUCT_INVALID", message: "Data produk baru tidak valid" });
          const createdProduct = await this.products.create(tenantId, productDto);
          productId = createdProduct.id;
        }
        resolvedItems.push({ ...item, productId });
      }

      const salePayload = action.tool === "updateSale"
        ? { occurredAt: payload.occurredAt, customerId, items: resolvedItems, discount: payload.discount, tax: payload.tax, notes: payload.notes }
        : { occurredAt: payload.occurredAt, customerId, items: resolvedItems, discount: payload.discount, tax: payload.tax, notes: payload.notes };
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
    } else if (action.tool === "updateProduct") {
      const product = await this.products.update(tenantId, String(payload.productId), payload as any);
      result = { productId: product.id, sku: product.sku, name: product.name };
    } else if (action.tool === "deleteProduct") {
      await this.products.remove(tenantId, String(payload.productId));
      result = { productId: payload.productId };
    } else if (action.tool === "updateCustomer") {
      const customer = await this.customers.update(tenantId, String(payload.customerId), payload as any);
      result = { customerId: customer.id, externalRef: customer.externalRef, name: customer.name };
    } else if (action.tool === "deleteCustomer") {
      await this.customers.remove(tenantId, String(payload.customerId));
      result = { customerId: payload.customerId };
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

  async listConversations(tenantId: string, userId: string, limit = 30, offset = 0, q?: string) {
    const take = Math.min(Math.max(limit || 30, 1), 100);
    const skip = Math.max(offset || 0, 0);
    const search = q?.trim().slice(0, 120);
    const where: any = { tenantId, userId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { messages: { some: { content: { contains: search } } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take,
        skip,
        select: { id: true, title: true, pinned: true, updatedAt: true, _count: { select: { messages: true } } },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);
    return {
      items: items.map((c) => ({ id: c.id, title: c.title ?? "Percakapan", pinned: c.pinned, updatedAt: c.updatedAt, messageCount: c._count.messages })),
      total,
      limit: take,
      offset: skip,
    };
  }

  async pinConversation(tenantId: string, userId: string, id: string, pinned: boolean) {
    const updated = await this.prisma.chatConversation.updateMany({
      where: { id, tenantId, userId },
      data: { pinned },
    });
    if (updated.count === 0) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });
    return { ok: true, pinned };
  }

  async getConversation(tenantId: string, userId: string, id: string) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: { id, tenantId, userId },
      include: { messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, toolName: true, toolResult: true, actionId: true, createdAt: true } } },
    });
    if (!conv) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });

    const actionIds = conv.messages.map((m) => m.actionId).filter((x): x is string => Boolean(x));
    const actions = actionIds.length ? await this.prisma.pendingAction.findMany({ where: { id: { in: actionIds }, tenantId } }) : [];
    const actionMap = new Map(actions.map((a) => [a.id, a]));

    return {
      conversation: { id: conv.id, title: conv.title ?? "Percakapan", createdAt: conv.createdAt, updatedAt: conv.updatedAt },
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        toolResult: m.toolResult,
        createdAt: m.createdAt,
        action: m.actionId
          ? this.toActionView(actionMap.get(m.actionId))
          : undefined,
      })),
    };
  }

  async renameConversation(tenantId: string, userId: string, id: string, title?: string) {
    const updated = await this.prisma.chatConversation.updateMany({
      where: { id, tenantId, userId },
      data: { title: (title ?? "").trim().slice(0, 80) || null },
    });
    if (updated.count === 0) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });
    return { ok: true };
  }

  async deleteConversation(tenantId: string, userId: string, id: string) {
    const deleted = await this.prisma.chatConversation.deleteMany({ where: { id, tenantId, userId } });
    if (deleted.count === 0) throw new NotFoundException({ code: "CONVERSATION_NOT_FOUND", message: "Percakapan tidak ditemukan" });
    return { ok: true };
  }

  private toActionView(action: any) {
    if (!action) return undefined;
    return {
      id: action.id,
      tool: action.tool,
      preview: action.preview,
      status: action.status,
      expiresAt: action.expiresAt,
      result: action.result ?? undefined,
    };
  }

  private async resolveSaleRefs(tenantId: string, args: Record<string, unknown>, createMissing: boolean): Promise<{ customerId?: string; warnings?: string[]; reply?: string }> {
    const result: { customerId?: string; warnings?: string[]; reply?: string } = { warnings: [] };
    if (args.customer) {
      const matches = await this.prisma.customer.findMany({
        where: { tenantId, OR: [{ name: { contains: String(args.customer) } }, { externalRef: String(args.customer) }] },
        select: { id: true, name: true },
        take: 6,
      });
      if (matches.length === 0) {
        if (createMissing) {
          args.createCustomer = { externalRef: String(args.customer), name: String(args.customer) };
          result.warnings!.push(`Pelanggan "${args.customer}" akan dibuat baru`);
        } else {
          result.reply = `Pelanggan "${args.customer}" tidak ditemukan. Buat pelanggan baru dulu atau sebut nama/referensi yang benar.`;
          return result;
        }
      } else if (matches.length > 1) {
        result.reply = `Ditemukan beberapa pelanggan mirip "${args.customer}": ${matches.map((m) => m.name).join(", ")}. Sebutkan yang tepat.`;
        return result;
      } else {
        result.customerId = matches[0].id;
      }
    }

    if (Array.isArray(args.items)) {
      const resolved: Record<string, unknown>[] = [];
      for (const item of args.items as Record<string, unknown>[]) {
        const next = { ...item };
        if (item.product && !item.productId) {
          const matches = await this.prisma.product.findMany({
            where: { tenantId, OR: [{ name: { contains: String(item.product) } }, { sku: String(item.product) }] },
            select: { id: true, name: true },
            take: 6,
          });
          if (matches.length === 0) {
            if (createMissing) {
              const sku = item.sku ? String(item.sku) : String(item.product).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produk";
              next.createProduct = { sku, name: String(item.product), price: Number(item.unitPrice) };
              result.warnings!.push(`Produk "${item.product}" akan dibuat baru`);
            } else {
              result.reply = `Produk "${item.product}" tidak ditemukan. Buat produk baru dulu atau sebut nama/SKU yang benar.`;
              return result;
            }
          } else if (matches.length > 1) {
            result.reply = `Ditemukan beberapa produk mirip "${item.product}": ${matches.map((m) => m.name).join(", ")}. Sebutkan yang tepat.`;
            return result;
          } else {
            next.productId = matches[0].id;
          }
        }
        resolved.push(next);
      }
      args.items = resolved;
    }
    return result;
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
      const createMissing = args.createMissing !== false;
      const resolved = await this.resolveSaleRefs(tenantId, args, createMissing);
      if (resolved.reply) {
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: resolved.reply } });
        return { conversationId, reply: resolved.reply };
      }
      const warnings = resolved.warnings ?? [];
      const payload = plainToInstance(CreateSaleDto, normalizeSaleArgs({ ...args, customerId: resolved.customerId }));
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
      const originalItems = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
      const actionItems = payload.items.map((item, index) => ({
        ...item,
        createProduct: originalItems[index]?.createProduct,
      }));
      const actionPayload = {
        occurredAt: payload.occurredAt,
        customerId: payload.customerId,
        customer: args.customer,
        createCustomer: args.createCustomer,
        createMissing,
        items: actionItems,
        discount: payload.discount ?? 0,
        tax: payload.tax ?? 0,
        notes: payload.notes,
      };
      const previewWithWarnings = warnings.length ? { ...preview, warnings } : preview;
      return this.createAction(tenantId, conversationId, tool, actionPayload, previewWithWarnings, text);
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
      const createMissing = args.createMissing !== false;
      const resolved = await this.resolveSaleRefs(tenantId, args, createMissing);
      if (resolved.reply) {
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: resolved.reply } });
        return { conversationId, reply: resolved.reply };
      }
      const warnings = resolved.warnings ?? [];
      const payload = plainToInstance(CreateSaleDto, normalizeSaleArgs({ ...args, customerId: resolved.customerId ?? sale.customerId ?? undefined }));
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
      const originalItems = Array.isArray(args.items) ? (args.items as Record<string, unknown>[]) : [];
      const actionItems = payload.items.map((item, index) => ({
        ...item,
        createProduct: originalItems[index]?.createProduct,
      }));
      const actionPayload = {
        saleId,
        occurredAt: payload.occurredAt,
        customerId: payload.customerId,
        customer: args.customer,
        createCustomer: args.createCustomer,
        createMissing,
        items: actionItems,
        discount: payload.discount ?? 0,
        tax: payload.tax ?? 0,
        notes: payload.notes,
      };
      const previewWithWarnings = warnings.length ? { ...preview, warnings } : preview;
      return this.createAction(tenantId, conversationId, tool, actionPayload, previewWithWarnings, text);
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

    if (tool === "updateProduct") {
      const productId = String(args.productId ?? "");
      const product = await this.products.get(tenantId, productId).catch(() => null);
      if (!product) {
        const reply = "Produk tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const payload = { productId, sku: args.sku ?? product.sku, name: args.name ?? product.name, category: args.category ?? product.category, price: args.price === undefined ? Number(product.price) : Number(args.price), cost: args.cost === undefined ? (product.cost === null ? undefined : Number(product.cost)) : Number(args.cost) };
      const preview = { before: { sku: product.sku, name: product.name, price: product.price }, after: { sku: payload.sku, name: payload.name, price: Number(payload.price).toFixed(2) } };
      return this.createAction(tenantId, conversationId, tool, payload, preview, text);
    }

    if (tool === "deleteProduct") {
      const productId = String(args.productId ?? "");
      const product = await this.products.get(tenantId, productId).catch(() => null);
      if (!product) {
        const reply = "Produk tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const preview = { productId, sku: product.sku, name: product.name, warning: "Produk akan dihapus permanen." };
      return this.createAction(tenantId, conversationId, tool, { productId }, preview, text);
    }

    if (tool === "updateCustomer") {
      const customerId = String(args.customerId ?? "");
      const customer = await this.customers.get(tenantId, customerId).catch(() => null);
      if (!customer) {
        const reply = "Pelanggan tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const payload = { customerId, externalRef: args.externalRef ?? customer.externalRef, name: args.name ?? customer.name, phone: args.phone ?? customer.phone, email: args.email ?? customer.email };
      const preview = { before: { externalRef: customer.externalRef, name: customer.name }, after: { externalRef: payload.externalRef, name: payload.name } };
      return this.createAction(tenantId, conversationId, tool, payload, preview, text);
    }

    if (tool === "deleteCustomer") {
      const customerId = String(args.customerId ?? "");
      const customer = await this.customers.get(tenantId, customerId).catch(() => null);
      if (!customer) {
        const reply = "Pelanggan tidak ditemukan.";
        await this.prisma.chatMessage.create({ data: { conversationId, role: "assistant", content: reply } });
        return { conversationId, reply };
      }
      const preview = { customerId, externalRef: customer.externalRef, name: customer.name, warning: "Pelanggan akan dihapus permanen." };
      return this.createAction(tenantId, conversationId, tool, { customerId }, preview, text);
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
      data: { conversationId, role: "assistant", content: reply, toolName: tool, toolResult: preview as any, actionId: action.id },
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
    customerId: args.customerId,
    items,
    discount: args.discount === undefined ? undefined : Number(args.discount),
    tax: args.tax === undefined ? undefined : Number(args.tax),
    notes: args.notes,
  };
}
