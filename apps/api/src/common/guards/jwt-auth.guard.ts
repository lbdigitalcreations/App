import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization as string | undefined;
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token && req.cookies?.lbdc_access_token) {
      token = req.cookies.lbdc_access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret-change-me';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, isActive: true, deletedAt: null },
        include: { role: true },
      });

      if (!user) {
        throw new UnauthorizedException('Account is inactive or not found');
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role.name,
        tenantId: user.tenantId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
