import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail/mail.service';
import { UploadFileDto } from '../files/dto';
import { LocalFilesService } from '../files/local-files.service';
import { userFixture } from '../users/test-utils';
import { UsersService } from '../users/users.service';
import { SettingsService } from './settings.service';

jest.mock('argon2');
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let usersService: UsersService;
  let mailService: MailService;
  let filesService: LocalFilesService;
  let user: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: UsersService,
          useValue: {
            update: jest.fn(),
            findByEmail: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: { sendChangeEmailConfirmation: jest.fn() },
        },
        {
          provide: LocalFilesService,
          useValue: { upload: jest.fn(), remove: jest.fn() },
        },
      ],
    }).compile();

    settingsService = module.get<SettingsService>(SettingsService);
    usersService = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    filesService = module.get<LocalFilesService>(LocalFilesService);
    user = userFixture();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateName', () => {
    it('should update the user name', async () => {
      const newName = 'new name';
      const updatedNameUser = userFixture({ name: newName });
      (usersService.update as jest.Mock).mockResolvedValue(updatedNameUser);

      const result = await settingsService.updateName(user.id, newName);

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        name: newName,
      });
      expect(result).toEqual(updatedNameUser);
    });
  });

  describe('updateAvatar', () => {
    it('should update the user avatar', async () => {
      const oldAvatarId = '1';
      const newAvatarId = '2';
      const user = userFixture({
        avatarId: oldAvatarId,
        avatar: {
          id: oldAvatarId,
          url: null,
          key: null,
          mimetype: 'image/jpeg',
          filename: 'foo.jpg',
          isLocal: true,
          path: '/path/to/foo.jpg',
        },
      });
      const uploadAvatarDto: UploadFileDto = {
        buffer: Buffer.from('avatar'),
        filename: 'avatar.png',
        mimetype: 'image/png',
        path: '/path/to/avatar.png',
      };

      (filesService.upload as jest.Mock).mockResolvedValue(['2']);
      (filesService.remove as jest.Mock).mockResolvedValue(null);
      (usersService.update as jest.Mock).mockResolvedValue(null);

      await settingsService.updateAvatar(user, uploadAvatarDto);

      expect(filesService.remove).toHaveBeenCalledWith([oldAvatarId]);
      expect(filesService.upload).toHaveBeenCalledWith([uploadAvatarDto]);
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        avatarId: newAvatarId,
      });
    });
  });

  describe('deleteAvatar', () => {
    it('should throw BadRequestException if the user has no avatar', async () => {
      await expect(settingsService.deleteAvatar(user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete the user avatar', async () => {
      (filesService.remove as jest.Mock).mockResolvedValue(null);

      await settingsService.deleteAvatar(
        userFixture({
          avatar: {
            key: 'key',
            id: '1',
            url: '',
            path: '',
            isLocal: false,
            filename: '',
            mimetype: '',
          },
          avatarId: '1',
        }),
      );

      expect(filesService.remove).toHaveBeenCalledWith(['1']);
    });
  });

  describe('updatePassword', () => {
    it('should throw BadRequestException if the current password is incorrect', async () => {
      const password = 'wrong-password';
      const newPassword = 'new-password';

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        settingsService.updatePassword(user, password, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update the user password', async () => {
      const password = 'current-password';
      const newPassword = 'new-password';
      const hashedNewPassword = 'hashed-new-password';

      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue(hashedNewPassword);

      await settingsService.updatePassword(user, password, newPassword);

      expect(argon2.verify).toHaveBeenCalledWith(user.password, password);
      expect(argon2.hash).toHaveBeenCalledWith(newPassword);
      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        password: hashedNewPassword,
      });
    });
  });

  describe('deleteAccount', () => {
    it('should throw BadRequestException if the current password is incorrect', async () => {
      const password = 'wrong-password';

      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        settingsService.deleteAccount(user, password),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw an error if user is not found', () => {
      const password = 'right-password';
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (usersService.remove as jest.Mock).mockRejectedValue(
        new NotFoundException(),
      );

      expect(settingsService.deleteAccount(user, password)).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should delete the user account', async () => {
      const password = 'right-password';
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (usersService.remove as jest.Mock).mockResolvedValue(null);

      await settingsService.deleteAccount(user, password);

      expect(usersService.remove).toHaveBeenCalledWith(user.id);
    });
  });

  describe('confirmEmailToken', () => {
    it('should throw BadRequestException if the token is invalid', async () => {
      const confirmingUser = userFixture({
        oldEmailToken: 'old-token',
        newEmailToken: 'new-token',
      });
      const token = 'invalid-token';
      const emailType = 'old';

      await expect(
        settingsService.confirmEmailToken(confirmingUser, token, emailType),
      ).rejects.toThrow(BadRequestException);
    });

    it('should confirm the email token', async () => {
      const confirmedUser = userFixture({
        oldEmailToken: 'old-token',
        newEmailToken: 'new-token',
        newEmail: 'new@example.com',
      });
      const token = 'old-token';
      const emailType = 'old';

      (usersService.update as jest.Mock).mockResolvedValue({
        ...confirmedUser,
        oldEmailToken: null,
      });

      const { message } = await settingsService.confirmEmailToken(
        confirmedUser,
        token,
        emailType,
      );
      expect(message).toBe(
        `Confirm your old email successfully. Now confirm the token sent to your new email`,
      );

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        [`${emailType}EmailToken`]: null,
      });
    });

    it('should confirm the email if both tokens are valid', async () => {
      const confirmedUser = userFixture({
        oldEmailToken: null,
        newEmailToken: 'new-token',
        newEmail: 'new@example.com',
      });
      const token = 'new-token';
      const emailTypeToken = 'new';

      (usersService.update as jest.Mock).mockResolvedValue({
        ...confirmedUser,
        newEmailToken: null,
      });

      const { message } = await settingsService.confirmEmailToken(
        confirmedUser,
        token,
        emailTypeToken,
      );
      expect(message).toBe('Your email has been successfully updated');

      expect(usersService.update).toHaveBeenLastCalledWith(user.id, {
        email: confirmedUser.newEmail,
        newEmail: null,
      });
    });
  });

  describe('initEmailChangeConfirmation', () => {
    it('should throw BadRequestException if the new email already exists', async () => {
      const newEmail = user.email;

      (usersService.findByEmail as jest.Mock).mockResolvedValue({
        id: 2,
        email: newEmail,
      });

      await expect(
        settingsService.initEmailChangeConfirmation(user, newEmail),
      ).rejects.toThrow(new BadRequestException('Email has not changed'));
    });

    it('should throw BadRequestException if someone is to update the same email', async () => {
      const newEmail = 'new@example.com';

      (usersService.update as jest.Mock).mockRejectedValue(
        new BadRequestException('Email already exists'),
      );

      await expect(
        settingsService.initEmailChangeConfirmation(user, newEmail),
      ).rejects.toThrow(new BadRequestException('Email already exists'));
    });

    it('should initiate email change confirmation', async () => {
      const newEmail = 'new@example.com';
      const oldEmailToken = 'old-email-token';
      const newEmailToken = 'new-email-token';

      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.update as jest.Mock).mockResolvedValue(null);
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce(oldEmailToken)
        .mockReturnValueOnce(newEmailToken);

      await settingsService.initEmailChangeConfirmation(user, newEmail);

      expect(usersService.update).toHaveBeenCalledWith(user.id, {
        oldEmailToken,
        newEmailToken,
        newEmail,
      });
      expect(mailService.sendChangeEmailConfirmation).toHaveBeenCalledWith(
        user.email,
        user.name,
        oldEmailToken,
        'old',
      );
      expect(mailService.sendChangeEmailConfirmation).toHaveBeenCalledWith(
        newEmail,
        user.name,
        newEmailToken,
        'new',
      );
    });
  });
});
