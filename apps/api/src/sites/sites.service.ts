import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import {
  NotificationEvent,
  PaymentStatus,
  ProjectStatus,
  PublicRsvpInput,
  PublicWishInput,
  SiteStatus,
} from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48) || 'celebration'
    );
  }

  async createOrSyncPreviewSite(adminId: string, projectId: string, customSlug?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        order: { include: { requirements: true, mediaAssets: true, template: true } },
        celebrationSite: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const req = project.order.requirements;
    const baseSlug = customSlug
      ? this.slugify(customSlug)
      : this.slugify(`${req?.honoreeNames || req?.celebrationTitle || project.referenceNumber}`);

    let slug = project.celebrationSite?.slug || baseSlug;
    if (!project.celebrationSite) {
      const exists = await this.prisma.celebrationSite.findUnique({ where: { slug } });
      if (exists) {
        slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const baseUrl = this.config.get<string>('PUBLIC_SITES_BASE_URL') || 'http://localhost:3000/sites';
    const publicUrl = `${baseUrl}/${slug}`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      color: { dark: '#202020', light: '#FFFFFF' },
      width: 400,
    });

    const photos = project.order.mediaAssets
      .filter((m) => m.category === 'PHOTO')
      .map((m) => ({
        id: m.id,
        url: this.storage.generateSignedUrl(m.id, 7 * 24 * 3600),
        name: m.originalName,
      }));
    const videos = project.order.mediaAssets
      .filter((m) => m.category === 'VIDEO')
      .map((m) => ({
        id: m.id,
        url: this.storage.generateSignedUrl(m.id, 7 * 24 * 3600),
        name: m.originalName,
      }));

    const site = await this.prisma.celebrationSite.upsert({
      where: { projectId },
      update: {
        qrCodeDataUrl,
        content: {
          upsert: {
            create: {
              celebrationTitle: req?.celebrationTitle || 'Special Celebration',
              honoreeNames: req?.honoreeNames || project.order.customerName,
              eventDate: req?.eventDate || '',
              eventTime: req?.eventTime,
              venueName: req?.venueName,
              venueAddress: req?.venueAddress,
              mapsUrl: req?.mapsUrl,
              description: req?.description,
              themeColor: req?.themeColor || '#C5A15A',
              animationStyle: req?.animationStyle || 'elegant-fade',
              countdownEnabled: req?.countdownEnabled ?? true,
              galleryEnabled: req?.galleryEnabled ?? true,
              rsvpEnabled: req?.rsvpEnabled ?? true,
              wishesEnabled: req?.wishesEnabled ?? true,
              itinerary: (req?.itinerary as any) || [],
              galleryImages: photos as any,
              videoUrls: videos as any,
            },
            update: {
              celebrationTitle: req?.celebrationTitle || 'Special Celebration',
              honoreeNames: req?.honoreeNames || project.order.customerName,
              eventDate: req?.eventDate || '',
              eventTime: req?.eventTime,
              venueName: req?.venueName,
              venueAddress: req?.venueAddress,
              mapsUrl: req?.mapsUrl,
              description: req?.description,
              themeColor: req?.themeColor || '#C5A15A',
              animationStyle: req?.animationStyle || 'elegant-fade',
              countdownEnabled: req?.countdownEnabled ?? true,
              galleryEnabled: req?.galleryEnabled ?? true,
              rsvpEnabled: req?.rsvpEnabled ?? true,
              wishesEnabled: req?.wishesEnabled ?? true,
              itinerary: (req?.itinerary as any) || [],
              ...(photos.length ? { galleryImages: photos as any } : {}),
              ...(videos.length ? { videoUrls: videos as any } : {}),
            },
          },
        },
      },
      create: {
        tenantId: project.tenantId,
        projectId,
        templateId: project.order.templateId,
        slug,
        status: SiteStatus.PREVIEW,
        seoTitle: `${req?.celebrationTitle || 'Celebration'} — LB Digital Creations`,
        seoDescription: req?.description?.slice(0, 160) || 'A bespoke celebration website by LB Digital Creations.',
        qrCodeDataUrl,
        content: {
          create: {
            celebrationTitle: req?.celebrationTitle || 'Special Celebration',
            honoreeNames: req?.honoreeNames || project.order.customerName,
            eventDate: req?.eventDate || '',
            eventTime: req?.eventTime,
            venueName: req?.venueName,
            venueAddress: req?.venueAddress,
            mapsUrl: req?.mapsUrl,
            description: req?.description,
            themeColor: req?.themeColor || '#C5A15A',
            animationStyle: req?.animationStyle || 'elegant-fade',
            countdownEnabled: req?.countdownEnabled ?? true,
            galleryEnabled: req?.galleryEnabled ?? true,
            rsvpEnabled: req?.rsvpEnabled ?? true,
            wishesEnabled: req?.wishesEnabled ?? true,
            itinerary: (req?.itinerary as any) || [],
            galleryImages: photos as any,
            videoUrls: videos as any,
          },
        },
      },
      include: { content: true },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        previewUrl: `${publicUrl}?preview=1`,
        ...(project.status === ProjectStatus.IN_PROGRESS || project.status === ProjectStatus.PAYMENT_VERIFIED
          ? { status: ProjectStatus.PREVIEW_READY, progressPercent: 60 }
          : {}),
      },
    });

    await this.audit.log({
      tenantId: project.tenantId,
      actorId: adminId,
      action: 'SITE_PREVIEW_GENERATED',
      entityType: 'CelebrationSite',
      entityId: site.id,
      metadata: { slug: site.slug },
    });

    return site;
  }

  async publishSite(adminId: string, siteId: string) {
    const site = await this.prisma.celebrationSite.findUnique({
      where: { id: siteId },
      include: { project: { include: { order: true } } },
    });
    if (!site) throw new NotFoundException('Celebration site not found');

    if (site.project.order.paymentStatus !== PaymentStatus.FULLY_PAID) {
      throw new BadRequestException(
        'Cannot publish celebration website until full payment (advance + balance) is verified.',
      );
    }

    const baseUrl = this.config.get<string>('PUBLIC_SITES_BASE_URL') || 'http://localhost:3000/sites';
    const finalUrl = `${baseUrl}/${site.slug}`;

    const updated = await this.prisma.celebrationSite.update({
      where: { id: siteId },
      data: { status: SiteStatus.PUBLISHED, publishedAt: new Date() },
    });

    await this.prisma.project.update({
      where: { id: site.projectId },
      data: {
        status: ProjectStatus.COMPLETED,
        progressPercent: 100,
        finalUrl,
        completedAt: new Date(),
        updates: {
          create: {
            fromStatus: site.project.status,
            toStatus: ProjectStatus.COMPLETED,
            note: `Celebration website published live at ${finalUrl}`,
            actorId: adminId,
          },
        },
      },
    });

    await this.notifications.dispatch({
      userId: site.project.order.customerId,
      event: NotificationEvent.WEBSITE_PUBLISHED,
      title: 'Your Celebration Website Is Live!',
      body: `Share your celebration website with friends and family: ${finalUrl}`,
      data: { slug: site.slug, finalUrl },
    });

    return { site: updated, finalUrl };
  }

  async updateSiteStatus(siteId: string, status: SiteStatus) {
    return this.prisma.celebrationSite.update({
      where: { id: siteId },
      data: {
        status,
        ...(status === SiteStatus.UNPUBLISHED ? { unpublishedAt: new Date() } : {}),
        ...(status === SiteStatus.ARCHIVED ? { archivedAt: new Date() } : {}),
      },
    });
  }

  async configureSitePrivacy(
    userId: string,
    role: string,
    siteId: string,
    body: {
      isPasswordProtected?: boolean;
      password?: string;
      guestInteractionsOn?: boolean;
    },
  ) {
    const site = await this.prisma.celebrationSite.findUnique({
      where: { id: siteId },
      include: { project: { include: { order: true } } },
    });
    if (!site) throw new NotFoundException('Site not found');
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && site.project.order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const data: any = {};
    if (body.guestInteractionsOn !== undefined) {
      data.guestInteractionsOn = body.guestInteractionsOn;
    }
    if (body.isPasswordProtected !== undefined) {
      data.isPasswordProtected = body.isPasswordProtected;
      if (body.isPasswordProtected && body.password) {
        data.accessPasswordHash = await bcrypt.hash(body.password, 10);
      } else if (!body.isPasswordProtected) {
        data.accessPasswordHash = null;
      }
    }

    return this.prisma.celebrationSite.update({ where: { id: siteId }, data });
  }

  async getPublicSite(slug: string, preview?: boolean, password?: string) {
    const site = await this.prisma.celebrationSite.findFirst({
      where: { slug, deletedAt: null },
      include: {
        template: { select: { slug: true, name: true, layoutConfig: true } },
        content: true,
        wishes: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!site) throw new NotFoundException('Celebration website not found');

    const allowedStatuses = preview
      ? [SiteStatus.PREVIEW, SiteStatus.PUBLISHED]
      : [SiteStatus.PUBLISHED];

    if (!allowedStatuses.includes(site.status as SiteStatus)) {
      throw new NotFoundException('This celebration website is not currently published');
    }

    if (site.isPasswordProtected && !preview) {
      if (!password) {
        return {
          requiresPassword: true,
          slug: site.slug,
          seoTitle: site.seoTitle,
        };
      }
      const ok = site.accessPasswordHash
        ? await bcrypt.compare(password, site.accessPasswordHash)
        : false;
      if (!ok) {
        throw new UnauthorizedException('Incorrect celebration website password');
      }
    }

    return {
      requiresPassword: false,
      id: site.id,
      slug: site.slug,
      status: site.status,
      guestInteractionsOn: site.guestInteractionsOn,
      seoTitle: site.seoTitle,
      seoDescription: site.seoDescription,
      qrCodeDataUrl: site.qrCodeDataUrl,
      template: site.template,
      content: site.content,
      wishes: site.wishes,
    };
  }

  async submitRsvp(slug: string, input: PublicRsvpInput) {
    const site = await this.prisma.celebrationSite.findUnique({ where: { slug } });
    if (!site || site.status !== SiteStatus.PUBLISHED) {
      throw new NotFoundException('Celebration website not found');
    }
    if (!site.guestInteractionsOn) {
      throw new ForbiddenException('Guest interactions are disabled for this website');
    }

    return this.prisma.rsvpResponse.create({
      data: {
        siteId: site.id,
        guestName: input.guestName,
        guestPhone: input.guestPhone ?? null,
        guestEmail: input.guestEmail || null,
        attending: input.attending,
        attendeeCount: input.attendeeCount,
        message: input.message ?? null,
      },
    });
  }

  async submitWish(slug: string, input: PublicWishInput) {
    const site = await this.prisma.celebrationSite.findUnique({ where: { slug } });
    if (!site || site.status !== SiteStatus.PUBLISHED) {
      throw new NotFoundException('Celebration website not found');
    }
    if (!site.guestInteractionsOn) {
      throw new ForbiddenException('Guest interactions are disabled for this website');
    }

    return this.prisma.wish.create({
      data: {
        siteId: site.id,
        guestName: input.guestName,
        relationship: input.relationship ?? null,
        message: input.message,
      },
    });
  }

  async listSiteGuestsAndRsvps(userId: string, role: string, siteId: string) {
    const site = await this.prisma.celebrationSite.findUnique({
      where: { id: siteId },
      include: { project: { include: { order: true } } },
    });
    if (!site) throw new NotFoundException('Site not found');
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && site.project.order.customerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const [rsvps, wishes] = await Promise.all([
      this.prisma.rsvpResponse.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.wish.findMany({ where: { siteId }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { rsvps, wishes };
  }

  async exportRsvpsCsv(userId: string, role: string, siteId: string): Promise<string> {
    const { rsvps } = await this.listSiteGuestsAndRsvps(userId, role, siteId);
    const header = 'Guest Name,Phone,Email,Attending,Attendees,Message,Submitted At\n';
    const rows = rsvps
      .map((r) =>
        [
          `"${(r.guestName || '').replace(/"/g, '""')}"`,
          `"${r.guestPhone || ''}"`,
          `"${r.guestEmail || ''}"`,
          r.attending,
          r.attendeeCount,
          `"${(r.message || '').replace(/"/g, '""')}"`,
          r.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');
    return header + rows;
  }

  async listAllSites(status?: string) {
    return this.prisma.celebrationSite.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      include: {
        content: { select: { celebrationTitle: true, honoreeNames: true, eventDate: true } },
        project: { select: { referenceNumber: true, order: { select: { orderNumber: true, customerName: true } } } },
        _count: { select: { rsvps: true, wishes: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
