import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('homepage')
  homepage() {
    return this.catalog.getHomepagePayload();
  }

  @Get('services')
  services(@Query('includeInactive') includeInactive?: string) {
    return this.catalog.listServices(includeInactive === 'true');
  }

  @Get('services/:slug')
  serviceBySlug(@Param('slug') slug: string) {
    return this.catalog.getServiceBySlug(slug);
  }

  @Get('templates')
  templates(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.catalog.listTemplates({
      category,
      search,
      sort,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('templates/:idOrSlug')
  templateDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getTemplateByIdOrSlug(idOrSlug);
  }

  @Get('packages')
  packages(@Query('includeInactive') includeInactive?: string) {
    return this.catalog.listPackages(includeInactive === 'true');
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  favorites(@CurrentUser() user: AuthUser) {
    return this.catalog.listFavorites(user.id);
  }

  @Post('favorites/:templateId')
  @UseGuards(JwtAuthGuard)
  toggleFavorite(@CurrentUser() user: AuthUser, @Param('templateId') templateId: string) {
    return this.catalog.toggleFavorite(user.id, templateId);
  }

  // Admin endpoints
  @Post('admin/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createService(@Body() body: any) {
    return this.catalog.createService(body);
  }

  @Patch('admin/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updateService(@Param('id') id: string, @Body() body: any) {
    return this.catalog.updateService(id, body);
  }

  @Delete('admin/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  deleteService(@Param('id') id: string) {
    return this.catalog.deleteService(id);
  }

  @Post('admin/templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createTemplate(@Body() body: any) {
    return this.catalog.createTemplate(body);
  }

  @Patch('admin/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.catalog.updateTemplate(id, body);
  }

  @Delete('admin/templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  deleteTemplate(@Param('id') id: string) {
    return this.catalog.deleteTemplate(id);
  }

  @Post('admin/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  createPackage(@Body() body: any) {
    return this.catalog.createPackage(body);
  }

  @Patch('admin/packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  updatePackage(@Param('id') id: string, @Body() body: any) {
    return this.catalog.updatePackage(id, body);
  }
}
