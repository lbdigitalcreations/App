# Database Schema & Operations

- **Engine**: PostgreSQL 16+ managed via Prisma ORM (`apps/api/prisma/schema.prisma`).
- **Identifiers**: UUID primary keys (`@db.Uuid`) across all tables.
- **Core Models**: `tenants`, `subscriptions`, `roles`, `permissions`, `role_permissions`, `users`, `user_profiles`, `user_sessions`, `otp_tokens`, `services`, `templates`, `template_features`, `favorite_templates`, `packages`, `studio_drafts`, `orders`, `order_requirements`, `media_assets`, `projects`, `project_updates`, `revisions`, `payments`, `invoices`, `celebration_sites`, `site_content`, `guests`, `rsvp_responses`, `wishes`, `referrals`, `referral_rewards`, `coupons`, `reviews`, `notifications`, `notification_logs`, `support_tickets`, `site_settings`, `ai_usage_logs`, `audit_logs`.

## Commands
- Generate client: `npx prisma generate --schema=apps/api/prisma/schema.prisma`
- Push/Migrate (Dev): `npx prisma db push --schema=apps/api/prisma/schema.prisma`
- Production deploy: `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`
- Dev Seed (blocked in `NODE_ENV=production`): `npm run db:seed`
