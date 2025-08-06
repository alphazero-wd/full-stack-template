import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { userFixture } from '../users/test-utils';
import {
  ConfirmEmailChangeDto,
  UpdateEmailDto,
  UpdateNameDto,
  UpdatePasswordDto,
} from './dto';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

describe('SettingsController', () => {
  let settingsController: SettingsController;
  let settingsService: SettingsService;
  let user: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        ConfigService,
        {
          provide: SettingsService,
          useValue: {
            updateName: jest.fn(),
            updatePassword: jest.fn(),
            deleteAccount: jest.fn(),
            initEmailChangeConfirmation: jest.fn(),
            confirmEmailToken: jest.fn(),
            updateAvatar: jest.fn(),
            deleteAvatar: jest.fn(),
          },
        },
      ],
    }).compile();

    settingsController = module.get<SettingsController>(SettingsController);
    settingsService = module.get<SettingsService>(SettingsService);
    user = userFixture();
  });

  describe('changeName', () => {
    it('should change the user name', async () => {
      const updateNameDto: UpdateNameDto = { name: 'New Name' };

      await settingsController.changeName(user, updateNameDto);

      expect(settingsService.updateName).toHaveBeenCalledWith(
        user.id,
        updateNameDto.name,
      );
    });
  });

  describe('changePassword', () => {
    it('should change the user password', async () => {
      const updatePasswordDto: UpdatePasswordDto = {
        password: 'oldPassword',
        newPassword: 'newPassword',
      };

      await settingsController.changePassword(user, updatePasswordDto);

      expect(settingsService.updatePassword).toHaveBeenCalledWith(
        user,
        updatePasswordDto.password,
        updatePasswordDto.newPassword,
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete the user account and clear the session', async () => {
      const req = {
        logOut: jest.fn(),
        session: {
          cookie: { maxAge: 100000 },
        },
      } as unknown as Request;
      await settingsController.deleteAccount(req, user, {
        password: user.password,
      });

      expect(settingsService.deleteAccount).toHaveBeenCalledWith(
        user,
        user.password,
      );
      expect(req.logOut).toHaveBeenCalled();
      expect(req.session.cookie.maxAge).toBe(0);
    });
  });

  describe('changeEmail', () => {
    it('should initiate email change confirmation', async () => {
      const updateEmailDto: UpdateEmailDto = { email: 'new@example.com' };

      await settingsController.changeEmail(user, updateEmailDto);

      expect(settingsService.initEmailChangeConfirmation).toHaveBeenCalledWith(
        user,
        updateEmailDto.email,
      );
    });
  });

  describe('confirmEmailToken', () => {
    it('should confirm old email token', async () => {
      const confirmEmailDto: ConfirmEmailChangeDto = {
        token: 'old-token',
        emailType: 'old',
      };

      await settingsController.confirmEmailToken(user, confirmEmailDto);

      expect(settingsService.confirmEmailToken).toHaveBeenCalledWith(
        user,
        confirmEmailDto.token,
        'old',
      );
    });
    it('should confirm new email token', async () => {
      const confirmEmailDto: ConfirmEmailChangeDto = {
        token: 'new-token',
        emailType: 'new',
      };

      await settingsController.confirmEmailToken(user, confirmEmailDto);

      expect(settingsService.confirmEmailToken).toHaveBeenCalledWith(
        user,
        confirmEmailDto.token,
        'new',
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should update the user avatar', async () => {
      const user = userFixture({
        avatarId: '2',
        avatar: {
          id: '2',
          url: '',
          key: 'old-avatar-key',
          mimetype: '',
          filename: '',
          isLocal: true,
          path: '',
        },
      });
      const file = {
        filename: 'avatar.png',
        buffer: Buffer.from('avatar'),
      } as Express.Multer.File;

      await settingsController.uploadAvatar([file], user);

      expect(settingsService.updateAvatar).toHaveBeenCalledWith(user, {
        filename: file.filename,
        buffer: file.buffer,
      });
    });
  });

  describe('removeAvatar', () => {
    it('should remove the user avatar', async () => {
      const user = userFixture({
        avatarId: '2',
        avatar: {
          id: '2',
          url: '',
          key: 'old-avatar-key',
          mimetype: '',
          filename: '',
          isLocal: true,
          path: '',
        },
      });

      await settingsController.removeAvatar(user);

      expect(settingsService.deleteAvatar).toHaveBeenCalledWith(user);
    });
  });
});
