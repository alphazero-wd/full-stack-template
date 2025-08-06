import { Module } from '@nestjs/common';
import { LocalFilesService } from './local-files.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [LocalFilesService],
  exports: [LocalFilesService],
})
export class FilesModule {}
