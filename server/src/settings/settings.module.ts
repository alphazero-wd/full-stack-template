import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { UsersModule } from '../users/users.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [UsersModule, FilesModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
