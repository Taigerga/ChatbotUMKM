import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CvController } from "./cv.controller.js";
import { CvService } from "./cv.service.js";

@Module({
  controllers: [CvController],
  providers: [CvService, TenantGuard],
})
export class CvModule {}
