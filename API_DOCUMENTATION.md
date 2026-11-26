# API Documentation (`/api/v1`)

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/verify-email`, `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/google`, `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`, `GET/PATCH /auth/me`, `GET/DELETE /auth/sessions`
- **Catalog**: `GET /catalog/homepage`, `GET /catalog/services`, `GET /catalog/services/:slug`, `GET /catalog/templates`, `GET /catalog/packages`, `GET/POST /catalog/favorites`, Admin CRUD `/catalog/admin/*`
- **Media**: `POST /media/upload`, `GET /media/:id/signed-url`, `GET /media/:id/file`, `DELETE /media/:id`
- **Studio**: `GET/PUT/DELETE /studio/drafts`
- **Orders**: `POST /orders/validate-coupon`, `POST /orders`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel`, `GET/POST /orders/support/tickets`, Admin `/orders/admin/*`
- **Payments**: `POST /payments/razorpay/order`, `POST /payments/razorpay/verify`, `POST /payments/razorpay/webhook`, `POST /payments/manual-upi`, `POST /payments/admin/:id/verify-upi`, `POST /payments/admin/:id/refund`, `GET /payments/invoices/:id/pdf`
- **Projects & Revisions**: `GET /projects`, `GET /projects/:id`, `POST /projects/:id/approve`, `POST /projects/:id/revisions`, Admin `/projects/admin/*`
- **Celebration Sites**: `GET /sites/public/:slug`, `POST /sites/public/:slug/rsvp`, `POST /sites/public/:slug/wishes`, `GET /sites/:id/rsvps/export`, Admin `/sites/admin/*`
- **Notifications, Marketing, AI, Admin**: `/notifications/*`, `/marketing/*`, `POST /ai/suggest`, `/admin/dashboard`, `/admin/customers`, `/admin/reports/export`, `/admin/settings`
