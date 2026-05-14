import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  private buildJwt(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }

  private userPayload(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = await this.usersService.create(dto);

    // Seed password history so the initial password is in the no-reuse list
    await this.usersService.savePasswordHistory(user.id, user.password!);

    return {
      accessToken: this.buildJwt(user.id, user.email),
      user: this.userPayload(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.isLocked) {
      throw new UnauthorizedException(
        'Account locked after too many failed attempts. Reset your password to unlock.',
      );
    }

    if (!user.password) throw new UnauthorizedException('Use Google sign-in for this account');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      const attempts = await this.usersService.recordFailedLogin(user.id);
      if (attempts >= 5) {
        throw new UnauthorizedException(
          'Account locked after too many failed attempts. Reset your password to unlock.',
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.resetLoginAttempts(user.id);

    return {
      accessToken: this.buildJwt(user.id, user.email),
      user: this.userPayload(user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    // Always return success to avoid email enumeration
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return;

    // Invalidate previous tokens for this user
    await this.resetTokenRepo.update({ userId: user.id, used: false }, { used: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.resetTokenRepo.save({ userId: user.id, token, expiresAt });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'https://smartfinance.co.ke';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await this.emailService.sendPasswordReset(user.email, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.resetTokenRepo.findOne({ where: { token: dto.token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const inHistory = await this.usersService.isPasswordInHistory(
      record.userId,
      dto.newPassword,
    );
    if (inHistory) {
      throw new BadRequestException('New password must differ from your last 5 passwords');
    }

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.setPassword(record.userId, hash);
    await this.usersService.savePasswordHistory(record.userId, hash);

    record.used = true;
    await this.resetTokenRepo.save(record);
    await this.usersService.resetLoginAttempts(record.userId);
  }

  async googleLogin(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }) {
    // 1. Already linked via Google ID — just refresh the avatar
    let user = await this.usersService.findByGoogleId(profile.googleId);
    if (user) {
      if (profile.avatarUrl) {
        await this.usersService.updateAvatarUrl(user.id, profile.avatarUrl);
        user.avatarUrl = profile.avatarUrl;
      }
      return {
        accessToken: this.buildJwt(user.id, user.email),
        user: this.userPayload(user),
      };
    }

    // 2. Existing email/password account — link Google without overwriting names
    const existing = await this.usersService.findByEmail(profile.email);
    if (existing) {
      await this.usersService.linkGoogleProfile(
        existing.id,
        profile.googleId,
        profile.avatarUrl,
      );
      existing.avatarUrl = profile.avatarUrl;
      return {
        accessToken: this.buildJwt(existing.id, existing.email),
        user: this.userPayload(existing),
      };
    }

    // 3. Brand-new user — create with full Google profile
    const newUser = await this.usersService.create({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl,
    });
    return {
      accessToken: this.buildJwt(newUser.id, newUser.email),
      user: this.userPayload(newUser),
    };
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    const existing = await this.usersService.findByGoogleId(googleId);
    if (existing && existing.id !== userId) {
      throw new ConflictException('This Google account is already linked to another user');
    }
    await this.usersService.linkGoogleProfile(userId, googleId, null);
  }
}
