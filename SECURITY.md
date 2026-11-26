# Security Architecture — LB Digital Creations

- **Authentication**: Short-lived JWT access tokens + rotated SHA-256 hashed refresh tokens stored in `user_sessions`, bcrypt password hashing, and account deactivation checks.
- **Authorization**: `JwtAuthGuard` + `RolesGuard` (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`). Cross-customer access to orders, projects, invoices, and drafts is strictly blocked at the service layer.
- **Input Validation & Sanitization**: Zod schemas in `@lbdc/shared` enforced via `ZodValidationPipe`. No raw customer HTML/JS is ever stored or executed.
- **Payment Security**: Server-side price calculation (`calculateOrderPricing`), Razorpay HMAC-SHA256 signature verification, webhook signature verification, `webhookEventId` idempotency, and manual UPI requiring explicit admin approval.
- **Private Media Access**: Private uploads are served only via HMAC-SHA256 time-limited signed URLs (`/api/v1/media/:id/file?exp=...&sig=...`).
- **Infrastructure Hardening**: Helmet security headers, strict CORS origins, Throttler rate limiting, PWA service worker explicitly excludes private account/API routes from caching, and `audit_logs` records sensitive actions.
