import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  CompleteMultipartUploadCommandOutput,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { v4 } from 'uuid';
import { FilesService } from './files.service';

@Injectable()
export class AWSFilesService implements FilesService {
  private s3Client: S3Client;
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
    });
  }

  async upload(uploadFilesDto: UploadFileDto[]) {
    try {
      const uploadResults = await this.uploadToS3(uploadFilesDto);
      const files = await this.prisma.file.createManyAndReturn({
        select: { id: true },
        data: uploadResults.map(({ Key, Location }, index) => ({
          key: Key,
          url: Location,
          isLocal: false,
          ...uploadFilesDto[index],
        })),
      });
      return files.map((file) => file.id);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  private async uploadToS3(uploadFilesDto: UploadFileDto[]) {
    const uploadResults: CompleteMultipartUploadCommandOutput[] = [];

    for (const { filename, buffer } of uploadFilesDto) {
      const key = `${v4()}-${filename}`;
      const multipartUpload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.configService.get('AWS_BUCKET_NAME'),
          Key: this.configService.get('AWS_OBJECT_DEST') + key,
          Body: buffer,
        },
      });
      const result = await multipartUpload.done();
      uploadResults.push(result);
    }
    return uploadResults;
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    if (!file)
      throw new NotFoundException({
        success: false,
        message: 'Cannot find file with the given `id`',
      });
    return file;
  }

  async remove(ids: string[]) {
    try {
      const fileKeys = await this.prisma.file.findMany({
        where: { id: { in: ids }, isLocal: false },
        select: { key: true },
      });
      if (fileKeys.length !== ids.length)
        throw new BadRequestException(
          'Cannot delete files as some of which are not found',
        );
      await this.prisma.file.deleteMany({
        where: { key: { in: fileKeys.map((k) => k.key) }, isLocal: false },
      });
      const command = new DeleteObjectsCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Delete: {
          Objects: fileKeys.map(({ key }) => ({
            Key: key,
          })),
        },
      });
      await this.s3Client.send(command);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(error.message);
    }
  }
}
