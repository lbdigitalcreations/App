import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  CreateRevisionInput,
  CreateRevisionSchema,
  RoleName,
} from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.projects.listProjects(user.id, user.role, status);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getProject(user.id, user.role, id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.customerApprovePreview(user.id, id);
  }

  @Post(':id/revisions')
  submitRevision(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateRevisionSchema)) body: CreateRevisionInput,
  ) {
    return this.projects.submitRevision(user.id, id, body);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  adminUpdate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    return this.projects.adminUpdateProject(user.id, id, body);
  }

  @Patch('admin/revisions/:revisionId')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  adminUpdateRevision(
    @CurrentUser() user: AuthUser,
    @Param('revisionId') revisionId: string,
    @Body() body: any,
  ) {
    return this.projects.adminUpdateRevision(user.id, revisionId, body);
  }
}
