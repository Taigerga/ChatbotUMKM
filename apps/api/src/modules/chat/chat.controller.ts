import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ChatService } from "./chat.service.js";
import { SendMessageDto } from "./dto/send-message.dto.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post("messages")
  send(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Body() dto: SendMessageDto) {
    return this.chat.send(tenantId, auth.userId, dto);
  }

  @Post("actions/:id/confirm")
  confirm(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.chat.confirm(tenantId, auth.userId, id);
  }

  @Post("actions/:id/cancel")
  cancel(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.chat.cancel(tenantId, auth.userId, id);
  }

  @Get("conversations")
  listConversations(
    @CurrentUser() auth: AuthContext,
    @CurrentTenant() tenantId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.chat.listConversations(tenantId, auth.userId, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }

  @Get("conversations/:id")
  getConversation(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.chat.getConversation(tenantId, auth.userId, id);
  }

  @Patch("conversations/:id")
  renameConversation(
    @CurrentUser() auth: AuthContext,
    @CurrentTenant() tenantId: string,
    @Param("id") id: string,
    @Body() body: { title?: string },
  ) {
    return this.chat.renameConversation(tenantId, auth.userId, id, body?.title);
  }

  @Delete("conversations/:id")
  deleteConversation(@CurrentUser() auth: AuthContext, @CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.chat.deleteConversation(tenantId, auth.userId, id);
  }
}
