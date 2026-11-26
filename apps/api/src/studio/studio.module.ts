import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Module } from '@nestjs/common';

@Controller('studio/drafts')
@UseGuards(JwtAuthGuard)
export class StudioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.studioDraft.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Put()
  async upsert(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      id?: string;
      serviceId?: string;
      templateId?: string;
      packageId?: string;
      payload: Record<string, unknown>;
    },
  ) {
    if (body.id) {
      const existing = await this.prisma.studioDraft.findFirst({
        where: { id: body.id, userId: user.id },
      });
      if (existing) {
        return this.prisma.studioDraft.update({
          where: { id: existing.id },
          data: {
            serviceId: body.serviceId ?? existing.serviceId,
            templateId: body.templateId ?? existing.templateId,
            packageId: body.packageId ?? existing.packageId,
            payload: body.payload as any,
          },
        });
      }
    }

    return this.prisma.studioDraft.create({
      data: {
        userId: user.id,
        serviceId: body.serviceId ?? null,
        templateId: body.templateId ?? null,
        packageId: body.packageId ?? null,
        payload: body.payload as any,
      },
    });
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.studioDraft.deleteMany({
      where: { id, userId: user.id },
    });
    return { deleted: true };
  }
}

@Module({
  controllers: [StudioController],
})
export class StudioModule {}
