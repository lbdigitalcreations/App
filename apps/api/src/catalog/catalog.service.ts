import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTenantId() {
    const tenant = await this.prisma.tenant.findFirst({ where: { slug: 'lbdc', isActive: true } });
    if (!tenant) throw new NotFoundException('Default tenant not found');
    return tenant.id;
  }

  async getHomepagePayload() {
    const tenantId = await this.getTenantId();
    const [services, featuredTemplates, packages, reviews, settings] = await Promise.all([
      this.prisma.service.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.template.findMany({
        where: { tenantId, isActive: true, isFeatured: true, deletedAt: null },
        include: { service: { select: { id: true, slug: true, title: true } }, features: true },
        orderBy: { displayOrder: 'asc' },
        take: 8,
      }),
      this.prisma.package.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        orderBy: { displayOrder: 'asc' },
      }),
      this.prisma.review.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.siteSetting.findMany({ where: { tenantId } }),
    ]);

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return { services, featuredTemplates, packages, reviews, settings: settingsMap };
  }

  async listServices(includeInactive = false) {
    const tenantId = await this.getTenantId();
    return this.prisma.service.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { templates: true } },
      },
    });
  }

  async getServiceBySlug(slug: string) {
    const tenantId = await this.getTenantId();
    const service = await this.prisma.service.findFirst({
      where: { tenantId, slug, deletedAt: null },
      include: {
        templates: {
          where: { isActive: true, deletedAt: null },
          include: { features: true },
          orderBy: { displayOrder: 'asc' },
        },
        packages: { where: { isActive: true, deletedAt: null }, orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!service) throw new NotFoundException('Service category not found');
    return service;
  }

  async listTemplates(params: {
    category?: string;
    search?: string;
    sort?: string;
    includeInactive?: boolean;
  }) {
    const tenantId = await this.getTenantId();
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(params.includeInactive ? {} : { isActive: true }),
    };

    if (params.category) {
      where.service = { slug: params.category };
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { tagline: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any =
      params.sort === 'name'
        ? { name: 'asc' }
        : params.sort === 'newest'
          ? { createdAt: 'desc' }
          : { displayOrder: 'asc' };

    return this.prisma.template.findMany({
      where,
      orderBy,
      include: {
        service: { select: { id: true, slug: true, title: true, basePrice: true } },
        features: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async getTemplateByIdOrSlug(idOrSlug: string) {
    const tenantId = await this.getTenantId();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const tpl = await this.prisma.template.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
      },
      include: {
        service: true,
        features: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async listPackages(includeInactive = false) {
    const tenantId = await this.getTenantId();
    return this.prisma.package.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async listFavorites(userId: string) {
    return this.prisma.favoriteTemplate.findMany({
      where: { userId },
      include: {
        template: {
          include: { service: { select: { slug: true, title: true } }, features: true },
        },
      },
    });
  }

  async toggleFavorite(userId: string, templateId: string) {
    const existing = await this.prisma.favoriteTemplate.findUnique({
      where: { userId_templateId: { userId, templateId } },
    });
    if (existing) {
      await this.prisma.favoriteTemplate.delete({
        where: { userId_templateId: { userId, templateId } },
      });
      return { favorited: false };
    }
    await this.prisma.favoriteTemplate.create({
      data: { userId, templateId },
    });
    return { favorited: true };
  }

  // Admin CRUD
  async createService(data: any) {
    const tenantId = await this.getTenantId();
    return this.prisma.service.create({ data: { ...data, tenantId } });
  }

  async updateService(id: string, data: any) {
    return this.prisma.service.update({ where: { id }, data });
  }

  async deleteService(id: string) {
    return this.prisma.service.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async createTemplate(data: any) {
    const tenantId = await this.getTenantId();
    const { features, ...rest } = data;
    return this.prisma.template.create({
      data: {
        ...rest,
        tenantId,
        ...(features?.length ? { features: { create: features } } : {}),
      },
      include: { features: true },
    });
  }

  async updateTemplate(id: string, data: any) {
    const { features, ...rest } = data;
    if (Array.isArray(features)) {
      await this.prisma.templateFeature.deleteMany({ where: { templateId: id } });
      await this.prisma.templateFeature.createMany({
        data: features.map((f: any, idx: number) => ({
          templateId: id,
          key: f.key,
          label: f.label,
          description: f.description,
          isIncluded: f.isIncluded ?? true,
          addOnPrice: f.addOnPrice ?? 0,
          sortOrder: idx,
        })),
      });
    }
    return this.prisma.template.update({
      where: { id },
      data: rest,
      include: { features: true },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.template.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async createPackage(data: any) {
    const tenantId = await this.getTenantId();
    return this.prisma.package.create({ data: { ...data, tenantId } });
  }

  async updatePackage(id: string, data: any) {
    return this.prisma.package.update({ where: { id }, data });
  }
}
