import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  LoginInput,
  NotificationEvent,
  RegisterInput,
  RoleName,
} from '@lbdc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  private async getDefaultTenantAndCustomerRole() {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: 'lbdc', isActive: true },
    });
    if (!tenant) {
      throw new BadRequestException('Default LBDC tenant is not initialized');
    }
    const role = await this.prisma.role.findUnique({
      where: { name: RoleName.CUSTOMER },
    });
    if (!role) {
      throw new BadRequestException('Customer role is not initialized');
    }
    return { tenant, role };
  }

  private generateReferralCode(name: string): string {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'LBDC';
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}${rand}`;
  }

  async register(
    input: RegisterInput,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    if (input.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: input.phone } });
      if (phoneExists) {
        throw new ConflictException('An account with this phone number already exists');
      }
    }

    const { tenant, role } = await this.getDefaultTenantAndCustomerRole();
    const rounds = Number(this.config.get<string>('BCRYPT_ROUNDS') || 10);
    const passwordHash = await bcrypt.hash(input.password, rounds);

    let referredById: string | null = null;
    if (input.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: input.referralCode.trim().toUpperCase() },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId: tenant.id,
          roleId: role.id,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          referralCode: this.generateReferralCode(input.fullName),
          referredById,
          profile: {
            create: {
              fullName: input.fullName,
            },
          },
        },
        include: { role: true, profile: true },
      });

      if (referredById && referredById !== created.id) {
        await tx.referral.create({
          data: {
            referrerId: referredById,
            referredUserId: created.id,
            status: 'REGISTERED',
          },
        });
      }

      return created;
    });

    const verifyCode = await this.createOtpToken(user.id, user.email, 'EMAIL_VERIFY');
    await this.notifications.dispatch({
      userId: user.id,
      event: NotificationEvent.REGISTRATION,
      title: 'Welcome to LB Digital Creations',
      body: `Hello ${input.fullName}, welcome to LB Digital Creations! Your email verification code is ${verifyCode}.`,
    });

    await this.audit.log({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'AUTH_REGISTER',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
    });

    const tokens = await this.issueSessionTokens(user, meta);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      ...(process.env.NODE_ENV !== 'production' ? { devVerificationCode: verifyCode } : {}),
    };
  }

  async login(
    input: LoginInput,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      include: { role: true, profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
    });

    const tokens = await this.issueSessionTokens(user, meta);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(
    refreshToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: { include: { role: true, profile: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Rotate refresh token
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueSessionTokens(session.user, meta);
    return {
      user: this.sanitizeUser(session.user),
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.userSession.updateMany({
        where: { userId, refreshTokenHash: tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { loggedOut: true };
  }

  async verifyEmail(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.consumeOtpToken(user.email, 'EMAIL_VERIFY', code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    return { verified: true };
  }

  async requestPhoneOtp(phone: string) {
    const code = await this.createOtpToken(null, phone, 'PHONE_OTP');
    return {
      sent: true,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: code } : {}),
    };
  }

  async verifyPhoneOtp(
    phone: string,
    otp: string,
    fullName: string | undefined,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    await this.consumeOtpToken(phone, 'PHONE_OTP', otp);

    let user = await this.prisma.user.findFirst({
      where: { phone, deletedAt: null },
      include: { role: true, profile: true },
    });

    if (!user) {
      const { tenant, role } = await this.getDefaultTenantAndCustomerRole();
      const name = fullName || 'LBDC Guest';
      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: role.id,
          email: `phone_${phone.replace(/\D/g, '')}@phone.lbdigitalcreations.in`,
          phone,
          isPhoneVerified: true,
          referralCode: this.generateReferralCode(name),
          profile: {
            create: { fullName: name },
          },
        },
        include: { role: true, profile: true },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true, lastLoginAt: new Date() },
      });
    }

    const tokens = await this.issueSessionTokens(user, meta);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async googleLogin(
    idToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google Sign-In is not configured on the server');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] },
      include: { role: true, profile: true },
    });

    if (!user) {
      const { tenant, role } = await this.getDefaultTenantAndCustomerRole();
      const fullName = payload.name || 'LBDC Customer';
      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: role.id,
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          isEmailVerified: true,
          referralCode: this.generateReferralCode(fullName),
          profile: {
            create: {
              fullName,
              avatarUrl: payload.picture ?? null,
            },
          },
        },
        include: { role: true, profile: true },
      });
    }

    const tokens = await this.issueSessionTokens(user, meta);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { sent: true }; // Prevent user enumeration
    }

    const token = crypto.randomBytes(24).toString('hex');
    const codeHash = this.hashToken(token);
    await this.prisma.otpToken.create({
      data: {
        userId: user.id,
        target: user.email,
        purpose: 'PASSWORD_RESET',
        codeHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await this.notifications.dispatch({
      userId: user.id,
      event: NotificationEvent.EMAIL_VERIFICATION,
      title: 'LBDC Password Reset',
      body: `Use this reset token to set a new password: ${token}`,
    });

    return {
      sent: true,
      ...(process.env.NODE_ENV !== 'production' ? { devResetToken: token } : {}),
    };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const codeHash = this.hashToken(token);
    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        purpose: 'PASSWORD_RESET',
        codeHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord || !otpRecord.userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const rounds = Number(this.config.get<string>('BCRYPT_ROUNDS') || 10);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: otpRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.otpToken.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: otpRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { reset: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, profile: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    body: {
      fullName?: string;
      phone?: string;
      city?: string;
      state?: string;
      avatarUrl?: string;
      notifyInApp?: boolean;
      notifyPush?: boolean;
      notifyEmail?: boolean;
      notifyWhatsapp?: boolean;
      notifyPromotional?: boolean;
      marketingConsent?: boolean;
      fcmToken?: string;
    },
  ) {
    if (body.phone !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: body.phone || null },
      });
    }

    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const fcmTokens =
      body.fcmToken && existingProfile && !existingProfile.fcmTokens.includes(body.fcmToken)
        ? [...existingProfile.fcmTokens, body.fcmToken]
        : existingProfile?.fcmTokens;

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.state !== undefined ? { state: body.state } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
        ...(body.notifyInApp !== undefined ? { notifyInApp: body.notifyInApp } : {}),
        ...(body.notifyPush !== undefined ? { notifyPush: body.notifyPush } : {}),
        ...(body.notifyEmail !== undefined ? { notifyEmail: body.notifyEmail } : {}),
        ...(body.notifyWhatsapp !== undefined ? { notifyWhatsapp: body.notifyWhatsapp } : {}),
        ...(body.notifyPromotional !== undefined
          ? { notifyPromotional: body.notifyPromotional }
          : {}),
        ...(body.marketingConsent !== undefined
          ? { marketingConsent: body.marketingConsent }
          : {}),
        ...(fcmTokens ? { fcmTokens } : {}),
      },
      create: {
        userId,
        fullName: body.fullName || 'LBDC User',
        city: body.city,
        state: body.state,
      },
    });

    return this.getProfile(userId);
  }

  async listSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        deviceName: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async requestAccountDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequested: true, deletionRequestAt: new Date() },
    });
    return { deletionRequested: true };
  }

  private async issueSessionTokens(
    user: { id: string; email: string; tenantId: string; role: { name: string } },
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const accessSecret =
      this.config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret-change-me';
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role.name, tenantId: user.tenantId },
      { secret: accessSecret, expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m' },
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: meta.userAgent?.slice(0, 250) ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async createOtpToken(userId: string | null, target: string, purpose: string) {
    const code = String(crypto.randomInt(100000, 999999));
    await this.prisma.otpToken.create({
      data: {
        userId,
        target,
        purpose,
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    return code;
  }

  private async consumeOtpToken(target: string, purpose: string, code: string) {
    const record = await this.prisma.otpToken.findFirst({
      where: {
        target,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.attempts >= 5) {
      throw new BadRequestException('OTP expired or maximum attempts exceeded');
    }

    if (record.codeHash !== this.hashToken(code)) {
      await this.prisma.otpToken.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.otpToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role?.name,
      tenantId: user.tenantId,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      referralCode: user.referralCode,
      deletionRequested: user.deletionRequested,
      profile: user.profile,
      createdAt: user.createdAt,
    };
  }
}
