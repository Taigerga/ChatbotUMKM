import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { ImportsService } from "./imports.service.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("imports")
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post("preview")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async preview(
    @CurrentTenant() tenantId: string,
    @CurrentUser() auth: AuthContext,
    @UploadedFile() file: any,
    @Body("entity") entity: string,
    @Body("mapping") mapping?: string,
    @Body("createMissing") createMissing?: string,
  ) {
    if (!file) throw new BadRequestException({ code: "FILE_REQUIRED", message: "File CSV wajib diunggah" });
    let parsedMapping: Record<string, string | null> | undefined;
    if (mapping) {
      try { parsedMapping = JSON.parse(mapping); } catch { throw new BadRequestException({ code: "MAPPING_INVALID", message: "Pemetaan kolom tidak valid" }); }
    }
    const create = createMissing === "true" || createMissing === "1";
    return this.imports.preview(tenantId, auth.userId, entity, file.buffer, file.originalname, parsedMapping, create);
  }

  @Post(":id/confirm")
  confirm(
    @CurrentTenant() tenantId: string,
    @CurrentUser() auth: AuthContext,
    @Param("id") id: string,
    @Body() body: { mapping?: Record<string, string | null>; createMissing?: boolean },
  ) {
    return this.imports.confirm(tenantId, auth.userId, id, body?.mapping, Boolean(body?.createMissing));
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.imports.listJobs(tenantId, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
  }

  @Get("template")
  template(@Query("entity") entity: string) {
    return { csv: this.imports.template(entity || "products") };
  }

  @Get(":id")
  get(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.imports.getJob(tenantId, id);
  }
}
