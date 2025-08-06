import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';
import { CookieAuthGuard, EmailConfirmAuthGuard } from '../auth/guards';
import { LocalFilesInterceptor } from '../files/interceptors';
import { CurrentUser } from '../users/decorators';
import { UserWithAvatar } from '../users/types';
import {
  ConfirmEmailChangeDto,
  DeleteAccountDto,
  UpdateEmailDto,
  UpdateNameDto,
  UpdatePasswordDto,
} from './dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('profile/name')
  async changeName(@CurrentUser() user: User, @Body() { name }: UpdateNameDto) {
    await this.settingsService.updateName(user.id, name);
  }

  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('account/password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() { password, newPassword }: UpdatePasswordDto,
  ) {
    await this.settingsService.updatePassword(user, password, newPassword);
  }

  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('account/delete')
  async deleteAccount(
    @Req() req: Request,
    @CurrentUser() user: User,
    @Body() { password }: DeleteAccountDto,
  ) {
    await this.settingsService.deleteAccount(user, password);
    req.logOut(() => {});
    req.session.cookie.maxAge = 0;
  }

  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('account/email')
  async changeEmail(
    @CurrentUser() user: User,
    @Body() { email }: UpdateEmailDto,
  ) {
    await this.settingsService.initEmailChangeConfirmation(user, email);
  }

  @UseGuards(CookieAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('account/email/confirm-change')
  async confirmEmailToken(
    @CurrentUser() user: User,
    @Body() { token, emailType }: ConfirmEmailChangeDto,
  ) {
    return this.settingsService.confirmEmailToken(user, token, emailType);
  }

  @UseGuards(EmailConfirmAuthGuard())
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('profile/avatar')
  @UseInterceptors(
    LocalFilesInterceptor({
      maxFilesCount: 1,
      fieldName: 'avatar',
      path: '/avatars',
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.includes('image')) {
          return callback(
            new BadRequestException('Provide a valid image'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: Math.pow(1024, 2) * 2, // 2MB
      },
    }),
  )
  async uploadAvatar(
    @UploadedFiles()
    [avatar]: Express.Multer.File[],
    @CurrentUser() user: UserWithAvatar,
  ) {
    await this.settingsService.updateAvatar(user, {
      mimetype: avatar.mimetype,
      path: avatar.path,
      filename: avatar.filename,
      buffer: avatar.buffer,
    });
  }

  @UseGuards(EmailConfirmAuthGuard())
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('profile/avatar/remove')
  async removeAvatar(@CurrentUser() user: UserWithAvatar) {
    await this.settingsService.deleteAvatar(user);
  }
}
