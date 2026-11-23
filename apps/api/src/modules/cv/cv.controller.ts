import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentTenant } from "../../common/current-tenant.decorator.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { TenantGuard } from "../../common/tenant.guard.js";
import { CvService } from "./cv.service.js";
import { CvMappingDto } from "./dto/cv-mapping.dto.js";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("cv")
export class CvController {
  constructor(private readonly cv: CvService) {}

  @Get("classes")
  classes() {
    return this.cv.classes();
  }

  @Post("scan")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  scan(@CurrentTenant() tenantId: string, @CurrentUser() auth: AuthContext, @UploadedFile() file: any) {
    return this.cv.scan(tenantId, auth.userId, file);
  }

  @Get("scans")
  listScans(@CurrentTenant() tenantId: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.cv.listScans(tenantId, limit === undefined ? undefined : Number(limit), offset === undefined ? undefined : Number(offset));
  }

  @Get("scans/:id")
  getScan(@CurrentTenant() tenantId: string, @Param("id") id: string) {
    return this.cv.getScan(tenantId, id);
  }

  @Get("mappings")
  listMappings(@CurrentTenant() tenantId: string) {
    return this.cv.listMappings(tenantId);
  }

  @Put("mappings")
  upsertMapping(@CurrentTenant() tenantId: string, @Body() dto: CvMappingDto) {
    return this.cv.upsertMapping(tenantId, dto);
  }

  @Delete("mappings/:classId")
  deleteMapping(@CurrentTenant() tenantId: string, @Param("classId") classId: string) {
    if (!/^\d+$/.test(classId)) {
      throw new BadRequestException({ code: "INVALID_CLASS_ID", message: "classId harus bilangan bulat non-negatif" });
    }
    return this.cv.deleteMapping(tenantId, Number(classId));
  }
}
