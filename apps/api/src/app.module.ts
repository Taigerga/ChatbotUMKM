import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { AiProviderModule } from './modules/ai-provider/ai-provider.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    SalesModule,
    ChatModule,
    AiProviderModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
