import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { v4 } from 'uuid';
import { MailService } from '../mail/mail.service';
import { UploadFileDto } from '../files/dto';
import { LocalFilesService } from '../files/local-files.service';
import { UserWithAvatar } from '../users/types';
import { UsersService } from '../users/users.service';

@Injectable()
export class SettingsService {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
    private filesService: LocalFilesService,
  ) {}

  async updateName(userId: string, newName: string) {
    const updatedUser = await this.usersService.update(userId, {
      name: newName,
    });
    return updatedUser;
  }

  async updateAvatar(user: UserWithAvatar, uploadAvatarDto: UploadFileDto) {
    if (user.avatarId) await this.filesService.remove([user.avatar.id]);
    const [id] = await this.filesService.upload([uploadAvatarDto]);
    await this.usersService.update(user.id, { avatarId: id });
  }

  async deleteAvatar(user: UserWithAvatar) {
    if (!user.avatar)
      throw new BadRequestException("You haven't uploaded an avatar");
    await this.filesService.remove([user.avatar.id]);
  }

  async updatePassword(user: User, password: string, newPassword: string) {
    await this.validatePassword(password, user.password);
    const hashedPassword = await argon2.hash(newPassword);
    await this.usersService.update(user.id, {
      password: hashedPassword,
    });
  }

  private async validatePassword(plain: string, hash: string) {
    const isValidPassword = await argon2.verify(hash, plain);
    if (!isValidPassword)
      throw new BadRequestException('Incorrect password provided');
  }

  async deleteAccount(user: User, password: string) {
    await this.validatePassword(password, user.password);
    await this.usersService.remove(user.id);
  }

  async confirmEmailToken(user: User, token: string, emailType: 'old' | 'new') {
    const tokenType = `${emailType}EmailToken`;
    if (user[tokenType] !== token)
      throw new BadRequestException('Invalid token provided');
    const updatedUser = await this.usersService.update(user.id, {
      [tokenType]: null,
    });
    if (!updatedUser.oldEmailToken && !updatedUser.newEmailToken) {
      await this.usersService.update(user.id, {
        email: user.newEmail,
        newEmail: null,
      });
      return { message: 'Your email has been successfully updated' };
    } else {
      const opposite = emailType === 'old' ? 'new' : 'old';
      return {
        message: `Confirm your ${emailType} email successfully. Now confirm the token sent to your ${opposite} email`,
      };
    }
  }

  async initEmailChangeConfirmation(user: User, newEmail: string) {
    if (user.email === newEmail)
      throw new BadRequestException('Email has not changed');
    const existingUser = await this.usersService.findByEmail(newEmail);
    if (existingUser) throw new BadRequestException('Email already exists');
    const oldEmailToken = v4();
    const newEmailToken = v4();
    await this.usersService.update(user.id, {
      oldEmailToken,
      newEmailToken,
      newEmail,
    });
    await this.mailService.sendChangeEmailConfirmation(
      user.email,
      user.name,
      oldEmailToken,
      'old',
    );
    await this.mailService.sendChangeEmailConfirmation(
      newEmail,
      user.name,
      newEmailToken,
      'new',
    );
  }
}
