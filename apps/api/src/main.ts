import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ── Security middlewares ──────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: 'no-referrer' },
      contentSecurityPolicy: false, // adjust as needed for your frontend
    }),
  );
  app.use(compression());
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // Force HTTPS in production (Vercel terminates TLS but proxy may be behind)
  if (process.env.NODE_ENV === 'production') {
    app.use((req: any, res: any, next: any) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        return next();
      }
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    });
  }

  // Secure cookie parsing
  const cookieSecret = process.env.COOKIE_SECRET || undefined;
  app.use(cookieParser(cookieSecret));

  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((s) => s.trim());

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix, { exclude: ['/'] });
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  console.log(`LBDC API running on http://localhost:${port}/${prefix}`);
}

bootstrap();
// live supabase deployment
