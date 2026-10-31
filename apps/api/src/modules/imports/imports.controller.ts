import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { JwtAuthGuard } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ImportsService } from "./imports.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("imports")
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post("preview")
  @UseInterceptors(FileInterceptor("file"))
  preview(@CurrentTenant() tenantId: string, @UploadedFile() file: Express.Multer.File, @Body("entity") entity: string) {
    if (!file) throw new BadRequestException({ code: "FILE_REQUIRED", message: "File CSV wajib diunggah" });
    const records = this.imports.parseFile(file.buffer);
    if (entity === "products") return this.imports.previewProducts(tenantId, records);
    if (entity === "customers") return this.imports.previewCustomers(tenantId, records);
    throw new BadRequestException({ code: "ENTITY_UNKNOWN", message: "Jenis data tidak dikenal" });
  }

  @Post("commit")
  commit(@CurrentTenant() tenantId: string, @Body() body: { entity: string; rows: any[] }) {
    if (body.entity === "products") return this.imports.commitProducts(tenantId, body.rows);
    if (body.entity === "customers") return this.imports.commitCustomers(tenantId, body.rows);
    throw new BadRequestException({ code: "ENTITY_UNKNOWN", message: "Jenis data tidak dikenal" });
  }
}
EOF
echo done