import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Resolves the Postgres connection URL, supporting both explicit DATABASE_URL
 * and Supabase/Vercel Marketplace injected environment variables.
 */
function resolveDatabaseUrl(): string | undefined {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!direct) return undefined;

  // Ensure Supabase Transaction Pooler URLs on port 6543 disable prepared statements for Prisma.
  if (direct.includes(':6543/') && !direct.includes('pgbouncer=')) {
    const sep = direct.includes('?') ? '&' : '?';
    return `${direct}${sep}pgbouncer=true`;
  }

  return direct;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = resolveDatabaseUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err: any) {
      console.warn('[PrismaService] Deferred connect on cold start:', err.message);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (err: any) {
      // ignore on teardown
    }
  }
}
