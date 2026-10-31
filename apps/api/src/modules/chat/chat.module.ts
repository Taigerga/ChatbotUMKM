import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { AiProviderModule } from "../ai-provider/ai-provider.module.js";
import { SalesModule } from "../sales/sales.module.js";
import { ChatReadTools } from "./chat-read-tools.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  imports: [AiProviderModule, SalesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatReadTools, TenantGuard],
})
export class ChatModule {}
