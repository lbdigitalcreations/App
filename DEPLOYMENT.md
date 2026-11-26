# Deployment, Subdomains, Backups & Recovery

## Proposed Production Subdomains
- `www.lbdigitalcreations.in` — Public Marketing & Customer Web (`apps/web`)
- `app.lbdigitalcreations.in` — Customer App / PWA (`apps/web`)
- `admin.lbdigitalcreations.in` — Protected Admin Portal (`apps/admin`)
- `api.lbdigitalcreations.in` — Centralized NestJS Backend (`apps/api`)

> Keep the existing public static site operational until DNS, SSL, PostgreSQL, and staging verification are explicitly approved.

## External Credentials Required for Full Activation
1. **Razorpay**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
2. **SMTP Email**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
3. **Firebase Cloud Messaging**: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`
4. **Google Sign-In**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
5. **WhatsApp Cloud API**: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
6. **Cloud Media Storage (S3/Cloudinary)**: `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or `CLOUDINARY_*`

## Docker Deployment
```bash
docker compose up -d --build
```

## Mobile Builds (Expo EAS)
```bash
cd apps/mobile
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Database Backups & Recovery
- Automated daily `pg_dump` to encrypted object storage:
  `pg_dump "$DATABASE_URL" | gzip > lbdc-backup-$(date +%F).sql.gz`
- Point-in-time recovery via managed PostgreSQL snapshots.
- Monitoring: `GET /api/v1/health` uptime checks + structured NestJS logs + `audit_logs`.
