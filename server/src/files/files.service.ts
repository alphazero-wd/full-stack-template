import { UploadFileDto } from './dto';
import { File } from '@prisma/client';

export interface FilesService {
  upload(uploadFilesDto: UploadFileDto[]): Promise<string[]>;
  findOne(id: string): Promise<File | null>;
  remove(keys: string[]): Promise<void>;
}