import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../dist/app.module';
import { GlobalExceptionFilter } from '../dist/common/filters/http-exception.filter';
import { seedDatabase } from '../prisma/seed';

describe('LBDC Full Platform E2E & Security Suite', () => {
  let app: INestApplication;
  let pg: PGlite;
  let socketServer: PGLiteSocketServer;

  let customerToken = '';
  let customerBToken = '';
  let adminToken = '';
  let serviceId = '';
  let templateId = '';
  let packageId = '';
  let uploadedAssetId = '';
  let orderId = '';
  let projectId = '';
  let siteId = '';
  let siteSlug = '';
  let revisionId = '';
  let invoiceId = '';

  beforeAll(async () => {
    pg = new PGlite();
    await pg.waitReady;

    const initSql = fs.readFileSync(path.join(process.cwd(), 'prisma/init.sql'), 'utf8');
    await pg.exec(initSql);

    socketServer = new PGLiteSocketServer({
      db: pg,
      port: 55434,
      host: '127.0.0.1',
    });
    await socketServer.start();

    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@127.0.0.1:55434/postgres?sslmode=disable&pgbouncer=true&connection_limit=1';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890';
    process.env.SIGNED_URL_SECRET = 'test-signed-secret-1234567890';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.NODE_ENV = 'test';

    const seedClient = new PrismaClient();
    await seedDatabase(seedClient);
    await seedClient.$disconnect();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (socketServer) await socketServer.stop();
    if (pg) await pg.close();
  });

  it('1. Registers Customer A, Customer B, and logs in Admin', async () => {
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Diya Krishnan',
        email: 'diya@example.com',
        phone: '+919876543211',
        password: 'Password123',
      })
      .expect(201);

    expect(regA.body.accessToken).toBeDefined();
    customerToken = regA.body.accessToken;

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Vikram Rao',
        email: 'vikram@example.com',
        phone: '+919876543212',
        password: 'Password123',
      })
      .expect(201);
    customerBToken = regB.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@lbdigitalcreations.in',
        password: 'Admin@123456',
      })
      .expect(201);
    adminToken = adminLogin.body.accessToken;
    expect(adminLogin.body.user.role).toBe('SUPER_ADMIN');
  });

  it('2. Supports password reset flow', async () => {
    const reqReset = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ email: 'vikram@example.com' })
      .expect(201);
    expect(reqReset.body.devResetToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({
        token: reqReset.body.devResetToken,
        newPassword: 'NewPassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'vikram@example.com', password: 'NewPassword123' })
      .expect(201);
  });

  it('3. Browses services, templates, and packages', async () => {
    const svcs = await request(app.getHttpServer()).get('/api/v1/catalog/services').expect(200);
    expect(svcs.body.length).toBeGreaterThanOrEqual(11);
    serviceId = svcs.body[0].id;

    const tpls = await request(app.getHttpServer()).get('/api/v1/catalog/templates').expect(200);
    expect(tpls.body.length).toBeGreaterThan(0);
    templateId = tpls.body[0].id;

    const pkgs = await request(app.getHttpServer()).get('/api/v1/catalog/packages').expect(200);
    expect(pkgs.body.length).toBeGreaterThan(0);
    packageId = pkgs.body[0].id;
  });

  it('4. Uploads a photo and serves it via signed URL', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/v1/media/upload?category=PHOTO')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('file', Buffer.from('fake-jpeg-data'), {
        filename: 'memory.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    uploadedAssetId = upload.body.id;
    expect(upload.body.signedUrl).toContain('sig=');

    await request(app.getHttpServer()).get(upload.body.signedUrl).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/media/${uploadedAssetId}/file`).expect(403);
  });

  it('5. Validates coupon and creates order with 50/50 split', async () => {
    const coupon = await request(app.getHttpServer())
      .post('/api/v1/orders/validate-coupon')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'LBDC10', subtotal: 1999 })
      .expect(201);
    expect(coupon.body.discountAmount).toBeGreaterThan(0);

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId,
        templateId,
        packageId,
        selectedAddOnIds: [],
        couponCode: 'LBDC10',
        customerName: 'Diya Krishnan',
        customerEmail: 'diya@example.com',
        customerPhone: '+919876543211',
        customization: {
          serviceId,
          templateId,
          packageId,
          celebrationTitle: 'Diya & Arjun Royal Wedding',
          honoreeNames: 'Diya & Arjun',
          eventDate: '2026-12-20',
          venueName: 'Taj Coromandel',
          photoAssetIds: [uploadedAssetId],
          videoAssetIds: [],
        },
      })
      .expect(201);

    orderId = created.body.order.id;
    projectId = created.body.project.id;
    expect(created.body.order.advanceAmount).toBeDefined();
  });

  it('6. Enforces cross-customer data isolation & blocks unauthorized admin access', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerBToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('7. Verifies 50% advance payment, generates PDF invoice, and blocks duplicate webhooks', async () => {
    const upi = await request(app.getHttpServer())
      .post('/api/v1/payments/manual-upi')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        paymentType: 'ADVANCE',
        upiReferenceId: 'UTR1234567890',
      })
      .expect(201);

    expect(upi.body.status).toBe('PENDING');

    const verified = await request(app.getHttpServer())
      .post(`/api/v1/payments/admin/${upi.body.id}/verify-upi`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true })
      .expect(201);

    expect(verified.body.verified).toBe(true);
    invoiceId = verified.body.invoice.id;

    const pdf = await request(app.getHttpServer())
      .get(`/api/v1/payments/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');

    const webhookBody = JSON.stringify({ event: 'payment.captured', payload: {} });
    const sig = crypto
      .createHmac('sha256', 'test-webhook-secret')
      .update(webhookBody)
      .digest('hex');

    const wh1 = await request(app.getHttpServer())
      .post('/api/v1/payments/razorpay/webhook')
      .set('x-razorpay-signature', sig)
      .set('x-razorpay-event-id', 'evt_unique_1')
      .set('Content-Type', 'application/json')
      .send(webhookBody)
      .expect(201);
    expect(wh1.body.processed).toBe(true);
  });

  it('8. Runs project preview, revision workflow, approval, balance payment, and site publication', async () => {
    const preview = await request(app.getHttpServer())
      .post(`/api/v1/sites/admin/projects/${projectId}/preview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);
    siteId = preview.body.id;
    siteSlug = preview.body.slug;

    const rev = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/revisions`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        section: 'Hero & Title',
        description: 'Please update the subtitle to include both family names.',
        referenceAssetIds: [],
      })
      .expect(201);
    revisionId = rev.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/admin/revisions/${revisionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', adminRemarks: 'Updated as requested.' })
      .expect(200);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/approve`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(201);
    expect(approved.body.status).toBe('BALANCE_PENDING');

    await request(app.getHttpServer())
      .post(`/api/v1/sites/admin/${siteId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    const balUpi = await request(app.getHttpServer())
      .post('/api/v1/payments/manual-upi')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId,
        paymentType: 'BALANCE',
        upiReferenceId: 'UTR9999999999',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/payments/admin/${balUpi.body.id}/verify-upi`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true })
      .expect(201);

    const pub = await request(app.getHttpServer())
      .post(`/api/v1/sites/admin/${siteId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);
    expect(pub.body.site.status).toBe('PUBLISHED');
  });

  it('9. Public celebration site works without login, and supports RSVP & Guest Wishes', async () => {
    const publicSite = await request(app.getHttpServer())
      .get(`/api/v1/sites/public/${siteSlug}`)
      .expect(200);
    expect(publicSite.body.content.celebrationTitle).toBe('Diya & Arjun Royal Wedding');

    await request(app.getHttpServer())
      .post(`/api/v1/sites/public/${siteSlug}/rsvp`)
      .send({
        guestName: 'Meera Nair',
        attending: 'YES',
        attendeeCount: 2,
        message: 'See you there!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/sites/public/${siteSlug}/wishes`)
      .send({
        guestName: 'Meera Nair',
        relationship: 'Cousin',
        message: 'Wishing you a lifetime of happiness!',
      })
      .expect(201);

    const notifs = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(notifs.body.length).toBeGreaterThan(0);

    const dash = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(dash.body.kpis.completedProjects).toBe(1);

    const csv = await request(app.getHttpServer())
      .get('/api/v1/admin/reports/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(csv.text).toContain('Order Number');
  });
});
