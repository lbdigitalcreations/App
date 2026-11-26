import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationChannel, NotificationEvent } from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface DispatchNotificationInput {
  userId: string;
  event: NotificationEvent | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async dispatch(input: DispatchNotificationInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: { profile: true },
    });
    if (!user) return null;

    const notification = await this.prisma.notification.create({
      data: {
        userId: user.id,
        event: input.event,
        title: input.title,
        body: input.body,
        data: (input.data ?? {}) as any,
      },
    });

    const profile = user.profile;
    const requested = input.channels ?? [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
      NotificationChannel.WHATSAPP,
    ];

    for (const channel of requested) {
      if (channel === NotificationChannel.IN_APP) {
        if (profile?.notifyInApp !== false) {
          await this.recordLog(notification.id, 'IN_APP', user.id, 'SENT');
        }
        continue;
      }

      if (channel === NotificationChannel.EMAIL && profile?.notifyEmail !== false) {
        await this.sendEmailWithRetry(notification.id, user.email, input.title, input.body);
      }

      if (channel === NotificationChannel.PUSH && profile?.notifyPush !== false) {
        await this.sendFcmPush(notification.id, profile?.fcmTokens ?? [], input.title, input.body);
      }

      if (channel === NotificationChannel.WHATSAPP && profile?.notifyWhatsapp !== false && user.phone) {
        await this.sendWhatsApp(notification.id, user.phone, input.title, input.body);
      }
    }

    return notification;
  }

  private async sendEmailWithRetry(
    notificationId: string,
    to: string,
    subject: string,
    text: string,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      await this.recordLog(
        notificationId,
        'EMAIL',
        to,
        'SKIPPED_UNCONFIGURED',
        'SMTP_HOST/SMTP_USER/SMTP_PASS not configured',
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') || 587),
      secure: false,
      auth: { user, pass },
    });

    let lastError = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await transporter.sendMail({
          from: this.config.get<string>('SMTP_FROM') || 'LB Digital Creations <no-reply@lbdigitalcreations.in>',
          to,
          subject,
          text,
        });
        await this.recordLog(notificationId, 'EMAIL', to, 'SENT', undefined, attempt);
        return;
      } catch (err: any) {
        lastError = err?.message || 'SMTP send failed';
      }
    }
    this.logger.warn(`Email delivery failed for ${to}: ${lastError}`);
    await this.recordLog(notificationId, 'EMAIL', to, 'FAILED', lastError, 2);
  }

  private async sendFcmPush(
    notificationId: string,
    tokens: string[],
    _title: string,
    _body: string,
  ) {
    if (!tokens.length) {
      await this.recordLog(notificationId, 'PUSH', 'no-device-token', 'SKIPPED_UNCONFIGURED');
      return;
    }
    const projectId = this.config.get<string>('FCM_PROJECT_ID');
    if (!projectId) {
      await this.recordLog(
        notificationId,
        'PUSH',
        tokens[0],
        'SKIPPED_UNCONFIGURED',
        'FCM credentials not configured',
      );
      return;
    }
    await this.recordLog(notificationId, 'PUSH', tokens.join(','), 'QUEUED');
  }

  private async sendWhatsApp(
    notificationId: string,
    phone: string,
    title: string,
    body: string,
  ) {
    const token = this.config.get<string>('WHATSAPP_API_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    if (!token || !phoneNumberId) {
      await this.recordLog(
        notificationId,
        'WHATSAPP',
        phone,
        'SKIPPED_UNCONFIGURED',
        'WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID not configured',
      );
      return;
    }

    try {
      const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace('+', ''),
          type: 'text',
          text: { body: `${title}\n\n${body}` },
        }),
      });
      if (!resp.ok) {
        throw new Error(`WhatsApp API returned ${resp.status}`);
      }
      await this.recordLog(notificationId, 'WHATSAPP', phone, 'SENT');
    } catch (err: any) {
      await this.recordLog(notificationId, 'WHATSAPP', phone, 'FAILED', err?.message);
    }
  }

  private async recordLog(
    notificationId: string,
    channel: string,
    recipient: string,
    status: string,
    errorMessage?: string,
    attempts = 1,
  ) {
    await this.prisma.notificationLog.create({
      data: {
        notificationId,
        channel,
        recipient,
        status,
        errorMessage,
        attempts,
      },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
