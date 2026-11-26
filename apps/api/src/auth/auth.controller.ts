import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import {
  LoginInput,
  LoginSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  PhoneOtpRequestSchema,
  PhoneOtpVerifySchema,
  RegisterInput,
  RegisterSchema,
} from '@lbdc/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput, @Req() req: Request) {
    return this.auth.register(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('login')
  login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput, @Req() req: Request) {
    return this.auth.login(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string, @Req() req: Request) {
    return this.auth.refreshTokens(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthUser, @Body('refreshToken') refreshToken?: string) {
    return this.auth.logout(user.id, refreshToken);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  verifyEmail(@CurrentUser() user: AuthUser, @Body('code') code: string) {
    return this.auth.verifyEmail(user.id, code);
  }

  @Post('otp/request')
  requestPhoneOtp(@Body(new ZodValidationPipe(PhoneOtpRequestSchema)) body: { phone: string }) {
    return this.auth.requestPhoneOtp(body.phone);
  }

  @Post('otp/verify')
  verifyPhoneOtp(
    @Body(new ZodValidationPipe(PhoneOtpVerifySchema))
    body: { phone: string; otp: string; fullName?: string },
    @Req() req: Request,
  ) {
    return this.auth.verifyPhoneOtp(body.phone, body.otp, body.fullName, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('google')
  googleLogin(@Body('idToken') idToken: string, @Req() req: Request) {
    return this.auth.googleLogin(idToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('facebook')
  facebookLogin(@Body('accessToken') accessToken: string, @Req() req: Request) {
    return this.auth.facebookLogin(accessToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('password-reset/request')
  requestPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetRequestSchema)) body: { email: string },
  ) {
    return this.auth.requestPasswordReset(body.email);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(
    @Body(new ZodValidationPipe(PasswordResetConfirmSchema))
    body: { token: string; newPassword: string },
  ) {
    return this.auth.confirmPasswordReset(body.token, body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.auth.updateProfile(user.id, body);
  }

  @Post('me/delete-request')
  @UseGuards(JwtAuthGuard)
  requestDeletion(@CurrentUser() user: AuthUser) {
    return this.auth.requestAccountDeletion(user.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user.id);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.auth.revokeSession(user.id, id);
  }
}
