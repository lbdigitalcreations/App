import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import {
  PublicRsvpInput,
  PublicRsvpSchema,
  PublicWishInput,
  PublicWishSchema,
  RoleName,
  SiteStatus,
} from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get('public/:slug')
  getPublic(
    @Param('slug') slug: string,
    @Query('preview') preview?: string,
    @Query('password') password?: string,
  ) {
    return this.sites.getPublicSite(slug, preview === '1', password);
  }

  @Post('public/:slug/rsvp')
  submitRsvp(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(PublicRsvpSchema)) body: PublicRsvpInput,
  ) {
    return this.sites.submitRsvp(slug, body);
  }

  @Post('public/:slug/wishes')
  submitWish(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(PublicWishSchema)) body: PublicWishInput,
  ) {
    return this.sites.submitWish(slug, body);
  }

  @Get(':id/interactions')
  @UseGuards(JwtAuthGuard)
  interactions(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sites.listSiteGuestsAndRsvps(user.id, user.role, id);
  }

  @Get(':id/rsvps/export')
  @UseGuards(JwtAuthGuard)
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csv = await this.sites.exportRsvpsCsv(user.id, user.role, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rsvps-${id}.csv"`);
    return res.send(csv);
  }

  @Patch(':id/privacy')
  @UseGuards(JwtAuthGuard)
  configurePrivacy(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.sites.configureSitePrivacy(user.id, user.role, id, body);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  listAll(@Query('status') status?: string) {
    return this.sites.listAllSites(status);
  }

  @Post('admin/projects/:projectId/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  generatePreview(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body('slug') slug?: string,
  ) {
    return this.sites.createOrSyncPreviewSite(user.id, projectId, slug);
  }

  @Post('admin/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sites.publishSite(user.id, id);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  setStatus(@Param('id') id: string, @Body('status') status: SiteStatus) {
    return this.sites.updateSiteStatus(id, status);
  }
}
