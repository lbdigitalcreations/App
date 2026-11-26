import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.SKIP_AUTO_BOOTSTRAP === 'true') return;
    try {
      await this.ensureSystemBootstrap();
    } catch (err: any) {
      this.logger.warn(`Auto-bootstrap skipped or deferred: ${err?.message}`);
    }
  }

  async ensureSystemBootstrap() {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug: 'lbdc' } });
    if (existingTenant && !(adminEmail && adminPassword)) {
      const existingServices = await this.prisma.service.count({
        where: { tenantId: existingTenant.id },
      });
      if (existingServices > 0) {
        return;
      }
    }

    const tenant = await this.prisma.tenant.upsert({
      where: { slug: 'lbdc' },
      update: {},
      create: {
        slug: 'lbdc',
        name: 'LB Digital Creations',
        primaryColor: '#C5A15A',
        isActive: true,
        config: {
          tagline: 'Creating Websites for Your Special Moments',
          email: 'lbdigitalcreations7326@gmail.com',
          phone: '+916381366088',
        },
      },
    });

    await this.prisma.subscription.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: tenant.id,
        planName: 'LBDC_CORE',
        status: 'ACTIVE',
        maxOrders: 100000,
        maxStorageMb: 102400,
      },
    });

    const roleNames = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE'];
    const roles: Record<string, string> = {};
    for (const name of roleNames) {
      const r = await this.prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} role` },
      });
      roles[name] = r.id;
    }

    if (adminEmail && adminPassword) {
      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: adminEmail.toLowerCase() },
      });
      if (!existingAdmin) {
        const hash = await bcrypt.hash(adminPassword, 12);
        await this.prisma.user.create({
          data: {
            tenantId: tenant.id,
            roleId: roles.SUPER_ADMIN,
            email: adminEmail.toLowerCase(),
            phone: '+916381366088',
            passwordHash: hash,
            isEmailVerified: true,
            isPhoneVerified: true,
            referralCode: 'LBDCADMIN',
            profile: {
              create: {
                fullName: 'LBDC Super Admin',
                country: 'India',
              },
            },
          },
        });
      }
    }

    const serviceCount = await this.prisma.service.count({ where: { tenantId: tenant.id } });
    if (serviceCount === 0) {
      const categories = [
        { slug: 'wedding', title: 'Wedding', subtitle: 'Royal Digital Wedding Suites', description: 'Bespoke wedding websites with couple story, multi-event itinerary, 4K gallery, Google Maps venue links, and 1-tap RSVP.', basePrice: 4999, isFeatured: true, displayOrder: 1 },
        { slug: 'birthday', title: 'Birthday', subtitle: 'Milestone & Kids Birthday Portals', description: 'Interactive birthday celebration portals with live countdown, photo memories, wishes wall, and venue navigation.', basePrice: 1999, isFeatured: true, displayOrder: 2 },
        { slug: 'anniversary', title: 'Anniversary', subtitle: 'Golden & Silver Jubilee Tributes', description: 'Timeless anniversary websites celebrating years of togetherness with curated timelines, music, and family blessings.', basePrice: 2499, isFeatured: true, displayOrder: 3 },
        { slug: 'engagement', title: 'Engagement', subtitle: 'Ring Ceremony & Save-the-Date', description: 'Elegant engagement invitations with couple portraits, countdown timer, and instant guest RSVP tracking.', basePrice: 2999, isFeatured: true, displayOrder: 4 },
        { slug: 'baby-shower', title: 'Baby Shower', subtitle: 'Seemantham & Welcome Baby Portals', description: 'Warm, joyful digital invitations for baby showers with event schedule, gift/blessing wall, and location map.', basePrice: 1999, isFeatured: false, displayOrder: 5 },
        { slug: 'naming-ceremony', title: 'Naming Ceremony', subtitle: 'Naamkaran & Cradle Ceremony', description: 'Traditional yet modern naming ceremony portals featuring baby photos, family tree highlights, and RSVP.', basePrice: 1999, isFeatured: false, displayOrder: 6 },
        { slug: 'festival', title: 'Festival', subtitle: 'Diwali, Pongal, Eid & Christmas Celebrations', description: 'Share festive greetings, community gathering invites, and interactive celebration pages with friends and family.', basePrice: 1499, isFeatured: false, displayOrder: 7 },
        { slug: 'digital-invitation', title: 'Digital Invitation', subtitle: 'Housewarming, Graduation & Corporate Galas', description: 'Luxury shareable digital invitation cards upgraded into living, interactive web experiences with QR codes.', basePrice: 1799, isFeatured: false, displayOrder: 8 },
        { slug: 'love-story', title: 'Love Story', subtitle: 'Interactive Romantic Timelines', description: 'Private or shareable digital keepsakes chronicling your journey together with music, letters, and photo chapters.', basePrice: 2499, isFeatured: false, displayOrder: 9 },
        { slug: 'memorial-tribute', title: 'Memorial and Tribute', subtitle: 'Dignified Remembrance & Legacy Portals', description: 'Serene, respectful memorial websites to honor loved ones with life stories, photo tributes, and condolence books.', basePrice: 2499, isFeatured: false, displayOrder: 10 },
        { slug: 'custom-celebration', title: 'Custom Celebration', subtitle: 'Tailored Bespoke Event Portals', description: 'Have a unique milestone in mind? We craft a completely custom celebration website tailored to your vision.', basePrice: 3499, isFeatured: false, displayOrder: 11 },
      ];

      const servicesMap: Record<string, string> = {};
      for (const cat of categories) {
        const svc = await this.prisma.service.create({
          data: {
            tenantId: tenant.id,
            ...cat,
            includedFeatures: [
              'Responsive Luxury Design',
              'Live Countdown Timer',
              'Google Maps Venue Navigation',
              'WhatsApp & QR Code Sharing',
              'Guest Wishes Wall',
            ],
            additionalFeatures: [
              { id: 'custom-domain', label: 'Custom Domain Setup', price: 999 },
              { id: 'extra-gallery', label: 'Extended 4K Photo Gallery', price: 499 },
            ],
          },
        });
        servicesMap[cat.slug] = svc.id;
      }

      const templates = [
        { slug: 'royal-ivory-gold-wedding', serviceSlug: 'wedding', name: 'Royal Ivory & Gold', tagline: 'Timeless Champagne Heritage Suite', description: 'Crafted with Playfair Display typography, gold accents, multi-day wedding itinerary, and seamless RSVP.', defaultThemeColor: '#C5A15A', animationPreset: 'royal-curtain', isFeatured: true, displayOrder: 1 },
        { slug: 'velvet-heritage-mandap', serviceSlug: 'wedding', name: 'Velvet Heritage Mandap', tagline: 'Grand Indian Wedding Portal', description: 'Designed for grand Indian weddings with Sangeet, Mehendi, Haldi, and Muhurtham schedules.', defaultThemeColor: '#B8860B', animationPreset: 'floral-drift', isFeatured: true, displayOrder: 2 },
        { slug: 'champagne-starlight-birthday', serviceSlug: 'birthday', name: 'Champagne Starlight', tagline: 'Luxury Milestone Birthday Showcase', description: 'Animated hero reveal, milestone photo grid, live party countdown, and interactive guest wishes.', defaultThemeColor: '#C5A15A', animationPreset: 'sparkle-reveal', isFeatured: true, displayOrder: 3 },
        { slug: 'golden-jubilee-chronicle', serviceSlug: 'anniversary', name: 'Golden Jubilee Chronicle', tagline: '25th & 50th Anniversary Keepsake', description: 'Story-driven anniversary portal with memory chapters, background music, and family blessings.', defaultThemeColor: '#C5A15A', animationPreset: 'elegant-fade', isFeatured: true, displayOrder: 4 },
      ];

      for (const tpl of templates) {
        await this.prisma.template.create({
          data: {
            tenantId: tenant.id,
            serviceId: servicesMap[tpl.serviceSlug],
            slug: tpl.slug,
            name: tpl.name,
            tagline: tpl.tagline,
            description: tpl.description,
            defaultThemeColor: tpl.defaultThemeColor,
            animationPreset: tpl.animationPreset,
            isFeatured: tpl.isFeatured,
            displayOrder: tpl.displayOrder,
            features: {
              create: [
                { key: 'countdown', label: 'Live Countdown Timer', isIncluded: true, addOnPrice: 0, sortOrder: 1 },
                { key: 'gallery', label: 'Curated Photo Gallery', isIncluded: true, addOnPrice: 0, sortOrder: 2 },
                { key: 'rsvp', label: 'Interactive Guest RSVP', isIncluded: true, addOnPrice: 0, sortOrder: 3 },
              ],
            },
          },
        });
      }

      const packages = [
        { slug: 'silver-celebration', name: 'Silver Celebration', description: 'Essential luxury digital invitation & celebration portal for intimate gatherings.', price: 1999, deliveryDays: 2, isPopular: false, displayOrder: 1, includedFeatures: ['1-Page Luxury Website', 'Countdown Timer', 'Google Maps Pin', 'QR Code Share', 'Unlimited Revisions'] },
        { slug: 'royal-gold', name: 'Royal Gold', description: 'Signature celebration suite with full RSVP, wishes wall, itinerary, and music.', price: 3999, deliveryDays: 3, isPopular: true, displayOrder: 2, includedFeatures: ['Multi-Section Luxury Website', 'Interactive RSVP', 'Moderated Wishes Wall', 'Background Music', 'Unlimited Revisions'] },
        { slug: 'bespoke-imperial', name: 'Bespoke Imperial', description: 'Complete bespoke digital experience for grand weddings and milestone events.', price: 6999, deliveryDays: 5, isPopular: false, displayOrder: 3, includedFeatures: ['Full Custom Multi-Event Suite', '4K Photo & Video Highlights', 'Password Protection', 'CSV Guest Export', 'Unlimited Revisions'] },
      ];

      for (const pkg of packages) {
        await this.prisma.package.create({ data: { tenantId: tenant.id, ...pkg } });
      }
    }

    this.logger.log('System bootstrap verified (LBDC tenant, roles & catalog ready).');
  }
}
