import { Module } from "@nestjs/common";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ImportsController } from "./imports.controller.js";
import { ImportsService } from "./imports.service.js";

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, TenantGuard],
})
export class ImportsModule {}
EOF
echo done