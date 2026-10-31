import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AiProviderService } from "../ai-provider/ai-provider.service.js";
import type { ChatTurn } from "../ai-provider/provider.interface.js";
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
  ) {}

  async send(tenantId: string, userId: string, dto: SendMessageDto) {
    const conversation = dto.conversationId
      ? await this.prisma.chatConversation.findFirst({ where: { id: dto.conversationId, tenantId } })
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
    if (action.status === "executed") return { status: "executed", result: action.result };
    if (action.status === "cancelled") throw new ConflictException({ code: "ACTION_CANCELLED", message: "Aksi sudah dibatalkan" });
    if (action.status !== "proposed") throw new ConflictException({ code: "ACTION_NOT_PENDING", message: "Aksi tidak bisa dikonfirmasi" });
    if (action.expiresAt.getTime() < Date.now()) {
      throw new ConflictException({ code: "ACTION_EXPIRED", message: "Aksi sudah kedaluwarsa, minta ulang" });
    }

    const sale = await this.sales.create(tenantId, userId, action.payload as unknown as CreateSaleDto, {
      idempotencyKey: action.id,
      source: "chat",
    });
    const result = { saleId: sale.id, total: Number(sale.total).toFixed(2) };
    await this.prisma.pendingAction.update({ where: { id: action.id }, data: { status: "executed", executedAt: new Date(), result } });
    return { status: "executed", result };
  }

  async cancel(tenantId: string, actionId: string) {
    const action = await this.prisma.pendingAction.findFirst({ where: { id: actionId, tenantId } });
    if (!action) throw new NotFoundException({ code: "ACTION_NOT_FOUND", message: "Aksi tidak ditemukan" });
    if (action.status === "executed") throw new ConflictException({ code: "ACTION_EXECUTED", message: "Aksi sudah dijalankan" });
    await this.prisma.pendingAction.update({ where: { id: action.id }, data: { status: "cancelled" } });
    return { status: "cancelled" };
  }

  private async loadTurns(conversationId: string): Promise<ChatTurn[]> {    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return messages.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  private async runRead(tenantId: string, name: string, args: Record<string, unknown>) {
    if (name === "getSalesSummary") {
      return this.readTools.getSalesSummary(tenantId, args as { from: string; to: string });
    }
    if (name === "findProducts") {
      return this.readTools.findProducts(tenantId, args as { query: string });
    }
    return { error: `Tool ${name} tidak tersedia` };
  }

  private async propose(tenantId: string, conversationId: string, tool: string, args: Record<string, unknown>, text?: string) {
    const payload = plainToInstance(CreateSaleDto, normalizeArgs(args));
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
    const reply = text?.trim() || "Saya sudah menyiapkan ringkasan penjualan. Periksa lalu setujui untuk menyimpan.";

    const action = await this.prisma.pendingAction.create({
      data: {
        tenantId,
        conversationId,
        tool,
        payload: { occurredAt: payload.occurredAt, items: payload.items, discount: payload.discount ?? 0, tax: payload.tax ?? 0, notes: payload.notes },
        preview,
        expiresAt: new Date(Date.now() + ACTION_TTL_MS),
        idempotencyKey: randomUUID(),
      },
    });
    await this.prisma.chatMessage.create({
      data: { conversationId, role: "assistant", content: reply, toolName: tool, toolResult: preview },
    });

    return {
      conversationId,
      reply,
      action: { id: action.id, tool, preview, expiresAt: action.expiresAt },
    };
  }
}

function normalizeArgs(args: Record<string, unknown>): Record<string, unknown> {
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
