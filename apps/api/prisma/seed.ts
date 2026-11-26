import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedDatabase(prismaClient?: PrismaClient) {
  const prisma = prismaClient ?? new PrismaClient();
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    throw new Error('Refusing to run development seed in production environment.');
  }

  console.log('Seeding LB Digital Creations development database...');

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
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

  await prisma.subscription.upsert({
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

  // 2. Roles & Permissions
  const roleNames = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN', 'EMPLOYEE'];
  const roles: Record<string, string> = {};
  for (const name of roleNames) {
    const r = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
    roles[name] = r.id;
  }

  const permCodes = [
    'orders:read_own',
    'orders:create',
    'orders:manage',
    'projects:manage',
    'catalog:manage',
    'payments:reconcile',
    'settings:manage',
    'reports:view',
    'users:manage',
  ];
  for (const code of permCodes) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
    if (code === 'orders:read_own' || code === 'orders:create') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles.CUSTOMER, permissionId: p.id } },
        update: {},
        create: { roleId: roles.CUSTOMER, permissionId: p.id },
      });
    }
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.SUPER_ADMIN, permissionId: p.id } },
      update: {},
      create: { roleId: roles.SUPER_ADMIN, permissionId: p.id },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: roles.ADMIN, permissionId: p.id } },
      update: {},
      create: { roleId: roles.ADMIN, permissionId: p.id },
    });
  }

  // 3. Users
  const adminPass = await bcrypt.hash('Admin@123456', 10);
  const customerPass = await bcrypt.hash('Customer@123456', 10);

  await prisma.user.upsert({
    where: { email: 'admin@lbdigitalcreations.in' },
    update: {},
    create: {
      tenantId: tenant.id,
      roleId: roles.SUPER_ADMIN,
      email: 'admin@lbdigitalcreations.in',
      phone: '+916381366088',
      passwordHash: adminPass,
      isEmailVerified: true,
      isPhoneVerified: true,
      referralCode: 'LBDCADMIN',
      profile: {
        create: {
          fullName: 'LBDC Super Admin',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
        },
      },
    },
  });

  const demoCustomer = await prisma.user.upsert({
    where: { email: 'customer@lbdigitalcreations.in' },
    update: {},
    create: {
      tenantId: tenant.id,
      roleId: roles.CUSTOMER,
      email: 'customer@lbdigitalcreations.in',
      phone: '+919876543210',
      passwordHash: customerPass,
      isEmailVerified: true,
      isPhoneVerified: true,
      referralCode: 'LBDCDEMO1',
      profile: {
        create: {
          fullName: 'Aarav Sharma',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
        },
      },
    },
  });

  // 4. All 11 Celebration Categories (Services)
  const categoriesData = [
    {
      slug: 'wedding',
      title: 'Wedding',
      subtitle: 'Royal Digital Wedding Suites',
      description: 'Bespoke wedding websites with couple story, multi-event itinerary, 4K gallery, Google Maps venue links, and 1-tap RSVP.',
      basePrice: 4999,
      isFeatured: true,
      displayOrder: 1,
    },
    {
      slug: 'birthday',
      title: 'Birthday',
      subtitle: 'Milestone & Kids Birthday Portals',
      description: 'Interactive birthday celebration portals with live countdown, photo memories, wishes wall, and venue navigation.',
      basePrice: 1999,
      isFeatured: true,
      displayOrder: 2,
    },
    {
      slug: 'anniversary',
      title: 'Anniversary',
      subtitle: 'Golden & Silver Jubilee Tributes',
      description: 'Timeless anniversary websites celebrating years of togetherness with curated timelines, music, and family blessings.',
      basePrice: 2499,
      isFeatured: true,
      displayOrder: 3,
    },
    {
      slug: 'engagement',
      title: 'Engagement',
      subtitle: 'Ring Ceremony & Save-the-Date',
      description: 'Elegant engagement invitations with couple portraits, countdown timer, and instant guest RSVP tracking.',
      basePrice: 2999,
      isFeatured: true,
      displayOrder: 4,
    },
    {
      slug: 'baby-shower',
      title: 'Baby Shower',
      subtitle: 'Seemantham & Welcome Baby Portals',
      description: 'Warm, joyful digital invitations for baby showers with event schedule, gift/blessing wall, and location map.',
      basePrice: 1999,
      isFeatured: false,
      displayOrder: 5,
    },
    {
      slug: 'naming-ceremony',
      title: 'Naming Ceremony',
      subtitle: 'Naamkaran & Cradle Ceremony',
      description: 'Traditional yet modern naming ceremony portals featuring baby photos, family tree highlights, and RSVP.',
      basePrice: 1999,
      isFeatured: false,
      displayOrder: 6,
    },
    {
      slug: 'festival',
      title: 'Festival',
      subtitle: 'Diwali, Pongal, Eid & Christmas Celebrations',
      description: 'Share festive greetings, community gathering invites, and interactive celebration pages with friends and family.',
      basePrice: 1499,
      isFeatured: false,
      displayOrder: 7,
    },
    {
      slug: 'digital-invitation',
      title: 'Digital Invitation',
      subtitle: 'Housewarming, Graduation & Corporate Galas',
      description: 'Luxury shareable digital invitation cards upgraded into living, interactive web experiences with QR codes.',
      basePrice: 1799,
      isFeatured: false,
      displayOrder: 8,
    },
    {
      slug: 'love-story',
      title: 'Love Story',
      subtitle: 'Interactive Romantic Timelines',
      description: 'Private or shareable digital keepsakes chronicling your journey together with music, letters, and photo chapters.',
      basePrice: 2499,
      isFeatured: false,
      displayOrder: 9,
    },
    {
      slug: 'memorial-tribute',
      title: 'Memorial and Tribute',
      subtitle: 'Dignified Remembrance & Legacy Portals',
      description: 'Serene, respectful memorial websites to honor loved ones with life stories, photo tributes, and condolence books.',
      basePrice: 2499,
      isFeatured: false,
      displayOrder: 10,
    },
    {
      slug: 'custom-celebration',
      title: 'Custom Celebration',
      subtitle: 'Tailored Bespoke Event Portals',
      description: 'Have a unique milestone in mind? We craft a completely custom celebration website tailored to your vision.',
      basePrice: 3499,
      isFeatured: false,
      displayOrder: 11,
    },
  ];

  const servicesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const svc = await prisma.service.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: cat.slug,
        title: cat.title,
        subtitle: cat.subtitle,
        description: cat.description,
        basePrice: cat.basePrice,
        isFeatured: cat.isFeatured,
        displayOrder: cat.displayOrder,
        includedFeatures: [
          'Responsive Luxury Design',
          'Live Countdown Timer',
          'Google Maps Venue Navigation',
          'WhatsApp & QR Code Sharing',
          'Guest Wishes Wall',
        ],
        additionalFeatures: [
          { id: 'custom-domain', label: 'Custom Domain Setup', price: 999 },
          { id: 'extra-gallery', label: 'Extended 4K Photo Gallery (50+ Photos)', price: 499 },
          { id: 'video-reel', label: 'Embedded 4K Video Highlight Section', price: 699 },
          { id: 'password-lock', label: 'Private Guest Password Protection', price: 299 },
        ],
      },
    });
    servicesMap[cat.slug] = svc.id;
  }

  // 5. Templates
  const templatesData = [
    {
      slug: 'royal-ivory-gold-wedding',
      serviceSlug: 'wedding',
      name: 'Royal Ivory & Gold',
      tagline: 'Timeless Champagne Heritage Suite',
      description: 'Crafted with Playfair Display typography, subtle gold-foil accents, multi-day wedding itinerary, and seamless RSVP.',
      defaultThemeColor: '#C5A15A',
      animationPreset: 'royal-curtain',
      isFeatured: true,
      displayOrder: 1,
    },
    {
      slug: 'velvet-heritage-mandap',
      serviceSlug: 'wedding',
      name: 'Velvet Heritage Mandap',
      tagline: 'Grand South & North Indian Wedding Portal',
      description: 'Designed for grand Indian weddings with Sangeet, Mehendi, Haldi, and Muhurtham schedules.',
      defaultThemeColor: '#B8860B',
      animationPreset: 'floral-drift',
      isFeatured: true,
      displayOrder: 2,
    },
    {
      slug: 'champagne-starlight-birthday',
      serviceSlug: 'birthday',
      name: 'Champagne Starlight',
      tagline: 'Luxury Milestone Birthday Showcase',
      description: 'Animated hero reveal, milestone photo grid, live party countdown, and interactive guest wishes.',
      defaultThemeColor: '#C5A15A',
      animationPreset: 'sparkle-reveal',
      isFeatured: true,
      displayOrder: 3,
    },
    {
      slug: 'golden-jubilee-chronicle',
      serviceSlug: 'anniversary',
      name: 'Golden Jubilee Chronicle',
      tagline: '25th & 50th Anniversary Keepsake',
      description: 'Story-driven anniversary portal with memory chapters, background instrumental music, and family blessings.',
      defaultThemeColor: '#C5A15A',
      animationPreset: 'elegant-fade',
      isFeatured: true,
      displayOrder: 4,
    },
    {
      slug: 'pearl-blossom-engagement',
      serviceSlug: 'engagement',
      name: 'Pearl Blossom',
      tagline: 'Minimalist Ring Ceremony Portal',
      description: 'Clean white and champagne aesthetic with couple story and 1-tap RSVP.',
      defaultThemeColor: '#C5A15A',
      animationPreset: 'elegant-fade',
      isFeatured: false,
      displayOrder: 5,
    },
    {
      slug: 'cradle-serenity-naming',
      serviceSlug: 'naming-ceremony',
      name: 'Cradle Serenity',
      tagline: 'Soft Gold & Ivory Baby Welcome',
      description: 'Gentle celebration portal for baby showers and naming ceremonies.',
      defaultThemeColor: '#C5A15A',
      animationPreset: 'floral-drift',
      isFeatured: false,
      displayOrder: 6,
    },
  ];

  for (const tpl of templatesData) {
    const serviceId = servicesMap[tpl.serviceSlug];
    if (!serviceId) continue;
    await prisma.template.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: tpl.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        serviceId,
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
            { key: 'music', label: 'Ambient Background Music', isIncluded: true, addOnPrice: 0, sortOrder: 4 },
            { key: 'maps', label: 'Google Maps Venue Pin', isIncluded: true, addOnPrice: 0, sortOrder: 5 },
          ],
        },
      },
    });
  }

  // 6. Packages
  const packagesData = [
    {
      slug: 'silver-celebration',
      name: 'Silver Celebration',
      description: 'Essential luxury digital invitation & celebration portal for intimate gatherings.',
      price: 1999,
      deliveryDays: 2,
      isPopular: false,
      displayOrder: 1,
      includedFeatures: [
        '1-Page Luxury Celebration Website',
        'Live Countdown Timer',
        'Up to 10 Photos in Gallery',
        'Google Maps Venue Link',
        'QR Code & WhatsApp Share',
        'Unlimited Revisions Before Approval',
      ],
    },
    {
      slug: 'royal-gold',
      name: 'Royal Gold',
      description: 'Our signature celebration suite with full RSVP, wishes wall, itinerary, and music.',
      price: 3999,
      deliveryDays: 3,
      isPopular: true,
      displayOrder: 2,
      includedFeatures: [
        'Multi-Section Luxury Celebration Website',
        'Interactive Guest RSVP & Attendee Tracking',
        'Moderated Guest Wishes Wall',
        'Up to 30 Photos + Background Music',
        'Event Itinerary & Dress Code',
        'Unlimited Revisions Before Approval',
      ],
    },
    {
      slug: 'bespoke-imperial',
      name: 'Bespoke Imperial',
      description: 'Complete bespoke digital experience for grand weddings and milestone events.',
      price: 6999,
      deliveryDays: 5,
      isPopular: false,
      displayOrder: 3,
      includedFeatures: [
        'Full Custom Multi-Event Celebration Suite',
        '4K Photo Gallery + Embedded Video Highlights',
        'Password Protection Option',
        'Priority Dedicated Designer Support',
        'CSV Guest & RSVP Export',
        'Unlimited Revisions Before Approval',
      ],
    },
  ];

  for (const pkg of packagesData) {
    await prisma.package.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: pkg.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        deliveryDays: pkg.deliveryDays,
        isPopular: pkg.isPopular,
        displayOrder: pkg.displayOrder,
        includedFeatures: pkg.includedFeatures,
      },
    });
  }

  // 7. Coupons
  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'LBDC10' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'LBDC10',
      description: '10% Welcome Privilege on Your First Celebration Website',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 1500,
      maxDiscountAmt: 1000,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ROYAL500' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'ROYAL500',
      description: 'Flat ₹500 Off on Royal Gold & Imperial Suites',
      discountType: 'FIXED',
      discountValue: 500,
      minOrderAmount: 3500,
      isActive: true,
    },
  });

  // 8. Reviews
  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    await prisma.review.createMany({
      data: [
        {
          userId: demoCustomer.id,
          customerName: 'Priya & Karthik',
          rating: 5,
          title: 'Our Wedding Portal Was Unforgettable',
          comment: 'Every guest complimented the countdown, itinerary, and 1-tap RSVP. Truly luxury craftsmanship.',
          isPublished: true,
        },
        {
          userId: demoCustomer.id,
          customerName: 'Meenakshi Sundaram',
          rating: 5,
          title: 'Seamless Revisions & Fast Delivery',
          comment: 'LB Digital Creations transformed our parents’ 50th anniversary photos into a living keepsake.',
          isPublished: true,
        },
      ],
    });
  }

  // 9. Site Settings
  const defaultSettings = [
    {
      key: 'brand',
      value: {
        name: 'LB Digital Creations',
        tagline: 'Creating Websites for Your Special Moments',
        email: 'lbdigitalcreations7326@gmail.com',
        phone: '+916381366088',
        instagramUrl: 'https://www.instagram.com/lb_digital_creations',
        whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb7jTKl9sBIAWhoh383E',
      },
    },
    {
      key: 'policies',
      value: {
        advancePercent: 50,
        unlimitedRevisionsEnabled: true,
        taxPercent: 0,
        referralRewardAmount: 250,
      },
    },
    {
      key: 'homepage',
      value: {
        heroTitle: 'Turn Your Moments Into Living Websites',
        heroSubtitle: 'Bespoke interactive celebration websites for weddings, birthdays & landmark milestones.',
        specialOfferBanner: 'Use code LBDC10 for 10% off your first bespoke celebration website.',
        faqs: [
          {
            q: 'How does the 50% advance payment model work?',
            a: 'You pay 50% advance to initiate your bespoke celebration website. Once we deliver your interactive preview and you approve it (with unlimited revisions), you pay the remaining 50% balance to publish it live.',
          },
          {
            q: 'Can I request changes after seeing the preview?',
            a: 'Yes! Under our Unlimited Revisions policy, you can request adjustments to text, photos, colors, and sections until you are 100% delighted.',
          },
          {
            q: 'Do my guests need to log in to view my celebration website?',
            a: 'Never. Published celebration websites are instantly accessible via your unique link or QR code, with optional password protection if you prefer privacy.',
          },
        ],
      },
    },
  ];

  for (const s of defaultSettings) {
    await prisma.siteSetting.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: s.key } },
      update: {},
      create: {
        tenantId: tenant.id,
        key: s.key,
        value: s.value,
      },
    });
  }

  console.log('Seed completed successfully.');
}

if (require.main === module) {
  const cliPrisma = new PrismaClient();
  seedDatabase(cliPrisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await cliPrisma.$disconnect();
    });
}
