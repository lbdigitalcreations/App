import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { StorageService } from './storage.service';

@Controller('media')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: string,
    @Query('isPrivate') isPrivate?: string,
  ) {
    return this.storage.saveUpload({
      userId: user.id,
      file,
      category: category || 'PHOTO',
      isPrivate: isPrivate !== 'false',
    });
  }

  @Get(':id/signed-url')
  @UseGuards(JwtAuthGuard)
  async getSignedUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return { signedUrl: this.storage.generateSignedUrl(id) };
  }

  @Get(':id/file')
  async serveFile(
    @Param('id') id: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const { asset, filePath, buffer } = await this.storage.getAssetFile(id, exp, sig);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Cache-Control', asset.isPrivate ? 'private, max-age=300' : 'public, max-age=86400');
    if (buffer) {
      return res.send(buffer);
    }
    return res.sendFile(filePath!);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.storage.deleteAsset(user.id, user.role, id);
  }
}
