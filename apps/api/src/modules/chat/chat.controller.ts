import { Body, Controller, Post, UseGuards } from "@nestjs/common";
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
}
