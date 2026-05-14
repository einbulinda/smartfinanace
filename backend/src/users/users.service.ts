import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PasswordHistory } from './entities/password-history.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PASSWORD_HISTORY_LIMIT = 5;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistoryRepo: Repository<PasswordHistory>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { googleId } });
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    if (data.email) data.email = data.email.toLowerCase().trim();
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async updateGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepo.update(userId, { googleId });
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, { password: passwordHash });
  }

  async savePasswordHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.passwordHistoryRepo.save({ userId, passwordHash });
    const all = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (all.length > PASSWORD_HISTORY_LIMIT) {
      const toDelete = all.slice(PASSWORD_HISTORY_LIMIT).map((h) => h.id);
      await this.passwordHistoryRepo.delete(toDelete);
    }
  }

  async recordFailedLogin(userId: string): Promise<number> {
    const user: User | null = await this.usersRepo.findOne({
      where: { id: userId },
    });
    if (!user) return 0;
    const attempts: number = Number(user.failedLoginAttempts) + 1;
    await this.usersRepo.update(userId, {
      failedLoginAttempts: attempts,
      isLocked: attempts >= 5,
    });
    return attempts;
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await this.usersRepo.update(userId, {
      failedLoginAttempts: 0,
      isLocked: false,
    });
  }

  async isPasswordInHistory(
    userId: string,
    plainPassword: string,
  ): Promise<boolean> {
    const history = await this.passwordHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: PASSWORD_HISTORY_LIMIT,
    });
    for (const entry of history) {
      if (await bcrypt.compare(plainPassword, entry.passwordHash)) return true;
    }
    return false;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new BadRequestException('User not found');

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }
      if (!user.password) {
        throw new BadRequestException(
          'Account uses Google sign-in — set a password via forgot-password instead',
        );
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new BadRequestException('Current password is incorrect');
      user.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email.toLowerCase().trim();

    return this.usersRepo.save(user);
  }
}
