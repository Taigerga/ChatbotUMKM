import { Body, Controller, Delete, Get, Post, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { JwtAuthGuard, type AuthContext } from "../../common/jwt-auth.guard.js";
import { AiConfigService } from "./ai-config.service.js";
import { SaveAiConfigDto, TestAiConfigDto } from "./dto/ai-config.dto.js";

@UseGuards(JwtAuthGuard)
@Controller("ai-config")
export class AiConfigController {
  constructor(private readonly service: AiConfigService) {}

  @Get()
  get(@CurrentUser() auth: AuthContext) {
    return this.service.getMasked(auth.userId);
  }

  @Put()
  save(@CurrentUser() auth: AuthContext, @Body() dto: SaveAiConfigDto) {
    return this.service.save(auth.userId, dto);
  }

  @Delete()
  remove(@CurrentUser() auth: AuthContext) {
    return this.service.remove(auth.userId);
  }

  @Post("test")
  test(@Body() dto: TestAiConfigDto) {
    return this.service.test(dto);
  }
}