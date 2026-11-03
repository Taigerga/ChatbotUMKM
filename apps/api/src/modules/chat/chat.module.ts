import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { AiConfigModule } from "../ai-config/ai-config.module.js";
import { AiProviderModule } from "../ai-provider/ai-provider.module.js";
import { CustomersModule } from "../customers/customers.module.js";
import { MlModule } from "../ml/ml.module.js";
import { ProductsModule } from "../products/products.module.js";
import { SalesModule } from "../sales/sales.module.js";
import { ChatReadTools } from "./chat-read-tools.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  imports: [AiConfigModule, AiProviderModule, CustomersModule, MlModule, ProductsModule, SalesModule],
  controllers: [ChatController],
  providers: [ChatService, ChatReadTools, TenantGuard],
})
export class ChatModule {}
