# LB Digital Creations (LBDC) Platform

> **Tagline:** Creating Websites for Your Special Moments  
> **Official Website:** https://lbdigitalcreations.in

A complete, production-ready Digital Celebration SaaS Platform featuring:
- **Customer Web & PWA (`apps/web`)**: Next.js 15, React 19, Tailwind CSS, offline-capable PWA shell, Moments Studio, Order & Payment tracking, and the Public Celebration Website Engine (`/sites/[slug]`).
- **Protected Admin Portal (`apps/admin`)**: Next.js 15 dashboard for managing Orders, Projects, Services, Templates, Packages, Payments/Manual UPI, Websites, Customers, Marketing/Coupons, Reports/CSV, and Settings.
- **Mobile App (`apps/mobile`)**: Expo React Native (Android & iOS) sharing the same backend API, with SecureStore auth, image picker, push notifications, and deep linking.
- **Centralized Backend (`apps/api`)**: NestJS + PostgreSQL + Prisma ORM + Razorpay + PDFKit Invoices + QR Code + Unified Notifications + AI Assistant + Multi-Tenant SaaS foundation.
- **Shared Contracts (`packages/shared`)**: TypeScript types, Zod validation schemas, pricing calculator, project status state machine, and LBDC luxury gold/white design tokens.

## Quick Start

```bash
cp .env.example .env
npm install
npm run build:shared
npx prisma db push --schema=apps/api/prisma/schema.prisma
npm run db:seed
npm run dev:api
npm run dev:web
npm run dev:admin
```

## Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [SECURITY.md](./SECURITY.md)
- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
