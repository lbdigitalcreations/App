import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp3',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly signedUrlSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = path.resolve(
      this.config.get<string>('LOCAL_UPLOAD_DIR') || path.join(process.cwd(), 'uploads'),
    );
    this.signedUrlSecret =
      this.config.get<string>('SIGNED_URL_SECRET') || 'dev-signed-url-secret-change-me';

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveUpload(params: {
    userId: string;
    file: Express.Multer.File;
    category?: string;
    isPrivate?: boolean;
    orderId?: string;
  }) {
    const { file } = params;
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum allowed size of 25 MB');
    }

    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    const storageKey = `${crypto.randomUUID()}${safeExt}`;
    const targetPath = path.join(this.uploadDir, storageKey);

    await fs.promises.writeFile(targetPath, file.buffer);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        userId: params.userId,
        orderId: params.orderId ?? null,
        category: params.category || 'PHOTO',
        originalName: file.originalname.slice(0, 200),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        provider: 'local',
        isPrivate: params.isPrivate ?? true,
      },
    });

    return {
      ...asset,
      signedUrl: this.generateSignedUrl(asset.id),
    };
  }

  generateSignedUrl(assetId: string, ttlSeconds = 3600): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.sign(assetId, exp);
    const prefix = this.config.get<string>('API_PREFIX') || 'api/v1';
    return `/${prefix}/media/${assetId}/file?exp=${exp}&sig=${sig}`;
  }

  verifySignedUrl(assetId: string, expStr: string, sig: string): boolean {
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    const expected = this.sign(assetId, exp);
    try {
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  private sign(assetId: string, exp: number): string {
    return crypto
      .createHmac('sha256', this.signedUrlSecret)
      .update(`${assetId}:${exp}`)
      .digest('hex');
  }

  async getAssetFile(assetId: string, expStr?: string, sig?: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    if (asset.isPrivate) {
      if (!expStr || !sig || !this.verifySignedUrl(assetId, expStr, sig)) {
        throw new ForbiddenException('Invalid or expired signed media URL');
      }
    }

    const filePath = path.join(this.uploadDir, path.basename(asset.storageKey));
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Media file missing on storage');
    }

    return { asset, filePath };
  }

  async deleteAsset(userId: string, role: string, assetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }
    if (asset.userId !== userId && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot delete another user’s media asset');
    }

    const filePath = path.join(this.uploadDir, path.basename(asset.storageKey));
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    await this.prisma.mediaAsset.delete({ where: { id: assetId } });
    return { deleted: true, id: assetId };
  }
}
