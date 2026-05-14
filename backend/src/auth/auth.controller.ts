import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Request() req: { user: { userId: string; email: string } }) {
    return req.user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password updated successfully.' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google — no body needed
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Request() req: { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const result = await this.authService.googleLogin(req.user);
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'https://smartfinance.co.ke';
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.accessToken}`,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  async linkGoogle(
    @Request() req: { user: { userId: string } },
    @Body() body: { googleId: string },
  ) {
    await this.authService.linkGoogleAccount(req.user.userId, body.googleId);
    return { message: 'Google account linked.' };
  }
}
