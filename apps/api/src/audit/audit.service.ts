import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actorId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? null,
          ipAddress: params.ipAddress ?? null,
          metadata: (params.metadata ?? {}) as any,
        },
      });
    } catch {
      // Never crash primary business flow if audit write fails
    }
  }
}
