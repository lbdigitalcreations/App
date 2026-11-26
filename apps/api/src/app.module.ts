import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { StudioModule } from './studio/studio.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProjectsModule } from './projects/projects.module';
import { SitesModule } from './sites/sites.module';
import { MarketingModule } from './marketing/marketing.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';

@Controller()
export class RootController {
  @Get()
  index() {
    return {
      status: 'ok',
      service: 'lbdc-api',
      health: '/api/v1/health',
      timestamp: new Date().toISOString(),
    };
  }
}

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'lbdc-api', timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    AuthModule,
    CatalogModule,
    StudioModule,
    OrdersModule,
    PaymentsModule,
    ProjectsModule,
    SitesModule,
    MarketingModule,
    AiModule,
    AdminModule,
  ],
  controllers: [RootController, HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
