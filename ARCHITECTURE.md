# System Architecture — LB Digital Creations

## Monorepo Layout
- `packages/shared`: Shared Zod schemas, TypeScript enums, `calculateOrderPricing`, `canTransitionProjectStatus`, and `LBDC_COLORS`.
- `apps/api`: NestJS REST API (`/api/v1`) with Prisma ORM (PostgreSQL), Redis/BullMQ support, Helmet, Throttler rate limiting, and modular domains (`auth`, `catalog`, `studio`, `orders`, `payments`, `projects`, `sites`, `notifications`, `marketing`, `ai`, `admin`, `storage`, `audit`).
- `apps/web`: Next.js Customer Web Application, PWA (`manifest.json`, `sw.js`), Moments Studio, and Public Celebration Website Engine (`/sites/[slug]`).
- `apps/admin`: Next.js Protected Admin Dashboard (`ADMIN` / `SUPER_ADMIN` role-gated).
- `apps/mobile`: Expo React Native application targeting Android & iOS.

## Multi-Tenant SaaS Foundation
All core catalog, order, project, site, coupon, setting, and audit models carry a `tenantId` foreign key referencing `tenants`. Initial operation enables only the `lbdc` tenant while keeping tenant isolation enforced at the database and service layers.

## Project Status State Machine
Transitions are strictly validated by `canTransitionProjectStatus` in `@lbdc/shared`:
`NEW → PAYMENT_PENDING → PAYMENT_VERIFIED → ACCEPTED → IN_PROGRESS → PREVIEW_READY ↔ REVISION_REQUESTED → APPROVED → BALANCE_PENDING → PUBLISHING → COMPLETED`
- Cannot transition to `COMPLETED` unless `paymentStatus === FULLY_PAID` and `siteStatus === PUBLISHED`.
