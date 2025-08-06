import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { LocalFilesService } from './local-files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: LocalFilesService) {}

  @Get(':id')
  async showLocalImage(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.filesService.findOne(id);

    const stream = createReadStream(join(process.cwd(), file.path));

    response.set({
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Type': file.mimetype,
    });
    return new StreamableFile(stream);
  }
}