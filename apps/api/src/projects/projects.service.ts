import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canTransitionProjectStatus,
  CreateRevisionInput,
  NotificationEvent,
  PaymentStatus,
  ProjectStatus,
  RevisionStatus,
  SiteStatus,
} from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async listProjects(userId: string, role: string, status?: string) {
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(isAdmin ? {} : { order: { customerId: userId } }),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerId: true,
            customerName: true,
            paymentStatus: true,
            totalPrice: true,
            balanceAmount: true,
            service: { select: { title: true } },
            template: { select: { name: true } },
            requirements: { select: { celebrationTitle: true, eventDate: true } },
          },
        },
        celebrationSite: { select: { id: true, slug: true, status: true } },
        _count: { select: { revisions: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getProject(userId: string, role: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        order: {
          include: {
            service: true,
            template: true,
            package: true,
            requirements: true,
            mediaAssets: true,
          },
        },
        updates: { orderBy: { createdAt: 'desc' } },
        revisions: { orderBy: { revisionNumber: 'desc' } },
        celebrationSite: { include: { content: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && project.order.customerId !== userId) {
      throw new ForbiddenException('Access denied to this project');
    }
    return project;
  }

  async adminUpdateProject(
    adminId: string,
    projectId: string,
    body: {
      status?: ProjectStatus;
      progressPercent?: number;
      workNotes?: string;
      previewUrl?: string;
      finalUrl?: string;
      milestones?: any[];
      note?: string;
      assignedAdminId?: string;
    },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { order: true, celebrationSite: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (body.status && body.status !== project.status) {
      const check = canTransitionProjectStatus(
        project.status as ProjectStatus,
        body.status,
        {
          paymentStatus: project.order.paymentStatus as PaymentStatus,
          siteStatus: (project.celebrationSite?.status as SiteStatus) ?? null,
          balanceAmount: Number(project.order.balanceAmount),
        },
      );
      if (!check.allowed) {
        throw new BadRequestException(check.reason);
      }
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.progressPercent !== undefined ? { progressPercent: body.progressPercent } : {}),
        ...(body.workNotes !== undefined ? { workNotes: body.workNotes } : {}),
        ...(body.previewUrl !== undefined ? { previewUrl: body.previewUrl } : {}),
        ...(body.finalUrl !== undefined ? { finalUrl: body.finalUrl } : {}),
        ...(body.milestones ? { milestones: body.milestones as any } : {}),
        ...(body.assignedAdminId !== undefined ? { assignedAdminId: body.assignedAdminId } : {}),
        ...(body.status === ProjectStatus.IN_PROGRESS && !project.startDate
          ? { startDate: new Date() }
          : {}),
        ...(body.status === ProjectStatus.COMPLETED ? { completedAt: new Date(), progressPercent: 100 } : {}),
        ...(body.status && body.status !== project.status
          ? {
              updates: {
                create: {
                  fromStatus: project.status,
                  toStatus: body.status,
                  note: body.note || `Status updated to ${body.status}`,
                  actorId: adminId,
                },
              },
            }
          : {}),
      },
    });

    if (body.status === ProjectStatus.IN_PROGRESS) {
      await this.notifications.dispatch({
        userId: project.order.customerId,
        event: NotificationEvent.PROJECT_STARTED,
        title: `Project ${project.referenceNumber} Started`,
        body: 'Our designers have begun crafting your bespoke celebration website.',
      });
    } else if (body.status === ProjectStatus.PREVIEW_READY) {
      await this.notifications.dispatch({
        userId: project.order.customerId,
        event: NotificationEvent.PREVIEW_READY,
        title: `Preview Ready — ${project.referenceNumber}`,
        body: 'Your celebration website preview is ready for review! Log in to preview, request revisions, or approve.',
      });
    } else if (body.status === ProjectStatus.COMPLETED) {
      await this.notifications.dispatch({
        userId: project.order.customerId,
        event: NotificationEvent.ORDER_COMPLETED,
        title: `Project Completed — ${project.referenceNumber}`,
        body: 'Congratulations! Your celebration website is live and your project is complete.',
      });
    }

    await this.audit.log({
      tenantId: project.tenantId,
      actorId: adminId,
      action: 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: projectId,
      metadata: { from: project.status, to: body.status ?? project.status },
    });

    return updated;
  }

  async customerApprovePreview(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { order: true, celebrationSite: true },
    });
    if (!project || project.order.customerId !== userId) {
      throw new ForbiddenException('Project not found or access denied');
    }

    const nextStatus =
      Number(project.order.balanceAmount) > 0
        ? ProjectStatus.BALANCE_PENDING
        : ProjectStatus.PUBLISHING;

    const check = canTransitionProjectStatus(
      project.status as ProjectStatus,
      ProjectStatus.APPROVED,
      {
        paymentStatus: project.order.paymentStatus as PaymentStatus,
        siteStatus: (project.celebrationSite?.status as SiteStatus) ?? null,
        balanceAmount: Number(project.order.balanceAmount),
      },
    );
    if (!check.allowed) {
      throw new BadRequestException(check.reason);
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        status: nextStatus,
        progressPercent: nextStatus === ProjectStatus.PUBLISHING ? 90 : 80,
        updates: {
          create: [
            {
              fromStatus: project.status,
              toStatus: ProjectStatus.APPROVED,
              note: 'Customer approved the preview.',
              actorId: userId,
            },
            {
              fromStatus: ProjectStatus.APPROVED,
              toStatus: nextStatus,
              note:
                nextStatus === ProjectStatus.BALANCE_PENDING
                  ? 'Awaiting remaining 50% balance payment before publication.'
                  : 'Balance settled. Ready for website publication.',
              actorId: userId,
            },
          ],
        },
      },
    });

    if (nextStatus === ProjectStatus.BALANCE_PENDING) {
      await this.notifications.dispatch({
        userId,
        event: NotificationEvent.BALANCE_REMINDER,
        title: 'Preview Approved — Complete Final 50% Balance',
        body: `Your remaining balance is ₹${project.order.balanceAmount}. Complete payment to publish your celebration website live.`,
      });
    }

    return updated;
  }

  // Revisions Module
  async submitRevision(userId: string, projectId: string, input: CreateRevisionInput) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { order: true, revisions: true },
    });
    if (!project || project.order.customerId !== userId) {
      throw new ForbiddenException('Project not found or access denied');
    }

    const policiesSetting = await this.prisma.siteSetting.findUnique({
      where: { tenantId_key: { tenantId: project.tenantId, key: 'policies' } },
    });
    const policies = (policiesSetting?.value as any) || {};
    const unlimited = policies.unlimitedRevisionsEnabled !== false;
    const maxRevisions = Number(policies.maxRevisions ?? 3);

    if (!unlimited && project.revisions.length >= maxRevisions) {
      throw new BadRequestException(`Maximum revision limit (${maxRevisions}) reached`);
    }

    const revisionNumber = project.revisions.length + 1;

    const [revision] = await this.prisma.$transaction([
      this.prisma.revision.create({
        data: {
          projectId,
          customerId: userId,
          revisionNumber,
          section: input.section,
          description: input.description,
          referenceAssetIds: input.referenceAssetIds,
          status: RevisionStatus.REQUESTED,
        },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.REVISION_REQUESTED,
          updates: {
            create: {
              fromStatus: project.status,
              toStatus: ProjectStatus.REVISION_REQUESTED,
              note: `Revision #${revisionNumber} requested on "${input.section}".`,
              actorId: userId,
            },
          },
        },
      }),
    ]);

    await this.notifications.dispatch({
      userId,
      event: NotificationEvent.REVISION_REQUESTED,
      title: `Revision #${revisionNumber} Submitted`,
      body: `We received your revision request for "${input.section}". Our team will update your preview shortly.`,
    });

    return revision;
  }

  async adminUpdateRevision(
    adminId: string,
    revisionId: string,
    body: {
      status: RevisionStatus;
      adminRemarks?: string;
      revisedPreviewUrl?: string;
    },
  ) {
    const rev = await this.prisma.revision.findUnique({
      where: { id: revisionId },
      include: { project: { include: { order: true } } },
    });
    if (!rev) throw new NotFoundException('Revision not found');

    const updated = await this.prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: body.status,
        ...(body.adminRemarks !== undefined ? { adminRemarks: body.adminRemarks } : {}),
        ...(body.revisedPreviewUrl !== undefined
          ? { revisedPreviewUrl: body.revisedPreviewUrl }
          : {}),
        ...(body.status === RevisionStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });

    if (body.status === RevisionStatus.COMPLETED) {
      await this.prisma.project.update({
        where: { id: rev.projectId },
        data: {
          status: ProjectStatus.PREVIEW_READY,
          ...(body.revisedPreviewUrl ? { previewUrl: body.revisedPreviewUrl } : {}),
          updates: {
            create: {
              fromStatus: rev.project.status,
              toStatus: ProjectStatus.PREVIEW_READY,
              note: `Revision #${rev.revisionNumber} completed. Revised preview ready.`,
              actorId: adminId,
            },
          },
        },
      });

      await this.notifications.dispatch({
        userId: rev.project.order.customerId,
        event: NotificationEvent.REVISION_COMPLETED,
        title: `Revision #${rev.revisionNumber} Completed`,
        body: `Your requested changes for "${rev.section}" are live in the updated preview.`,
      });
    }

    return updated;
  }
}
