import * as argon2 from 'argon2';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto';
import { MailService } from '../mail/mail.service';
import { v4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  CONFIRM_EMAIL_KEY_PREFIX,
  FORGOT_PASSWORD_KEY_PREFIX,
} from '../common/constants';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheService: Cache,
  ) {}

  async register({ password, ...createUserDto }: CreateUserDto) {
    const hashedPassword = await argon2.hash(password);
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return user;
  }

  async sendConfirmationEmail(user: User) {
    const token = v4();
    await this.mailService.sendConfirmationEmail(user.email, user.name, token);
    await this.cacheService.set(
      `${CONFIRM_EMAIL_KEY_PREFIX}:${token}`,
      user.id,
    );
  }

  async confirmEmail(id: string, token: string) {
    const confirmToken = `${CONFIRM_EMAIL_KEY_PREFIX}:${token}`;
    const userId = await this.validateToken(confirmToken);
    if (id !== userId) throw new ForbiddenException();
    await this.cacheService.del(confirmToken);
    await this.usersService.confirmEmail(userId);
  }

  async handleForgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('Email does not exist');
    const token = v4();
    await this.cacheService.set(
      `${FORGOT_PASSWORD_KEY_PREFIX}:${token}`,
      user.id,
    );
    await this.mailService.sendResetPassword(user.email, user.name, token);
  }

  async handleResetPassword(token: string, newPassword: string) {
    const userId = await this.validateToken(
      `${FORGOT_PASSWORD_KEY_PREFIX}:${token}`,
    );
    const hashedPassword = await argon2.hash(newPassword);
    await this.cacheService.del(`${FORGOT_PASSWORD_KEY_PREFIX}:${token}`);
    await this.usersService.update(userId, { password: hashedPassword });
  }

  private async validateToken(token: string) {
    const userId = await this.cacheService.get<string>(token);
    if (!userId) throw new BadRequestException('Invalid token provided');
    return userId;
  }

  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) throw new BadRequestException();
      await this.verifyPassword(user.password, password);
      return user;
    } catch (error) {
      if (error instanceof BadRequestException)
        throw new BadRequestException('Wrong email or password provided');
      else throw new InternalServerErrorException();
    }
  }

  private async verifyPassword(hashed: string, plain: string) {
    const isCorrectPassword = await argon2.verify(hashed, plain);
    if (!isCorrectPassword) throw new BadRequestException();
  }
}
