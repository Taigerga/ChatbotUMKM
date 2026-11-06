import { Module } from "@nestjs/common";
import { MlController } from "./ml.controller.js";
import { MlService } from "./ml.service.js";
import { MlInsightsService } from "./ml-insights.service.js";

@Module({
  controllers: [MlController],
  providers: [MlService, MlInsightsService],
  exports: [MlService, MlInsightsService],
})
export class MlModule {}
