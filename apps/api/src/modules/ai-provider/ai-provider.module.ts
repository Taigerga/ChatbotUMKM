import { Module } from "@nestjs/common";
import { AiProviderService } from "./ai-provider.service.js";

@Module({
  providers: [{ provide: AiProviderService, useFactory: () => new AiProviderService() }],
  exports: [AiProviderService],
})
export class AiProviderModule {}
