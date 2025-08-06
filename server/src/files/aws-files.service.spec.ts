import { Test, TestingModule } from '@nestjs/testing';
import { AWSFilesService } from './aws-files.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { UploadFileDto } from './dto';
import { BadRequestException } from '@nestjs/common';

jest.mock('uuid', () => ({
  v4: () => '123',
}));
const s3Mock = mockClient(S3Client);

describe('AWSFilesService', () => {
  let service: AWSFilesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AWSFilesService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'AWS_BUCKET_NAME':
                  return 'test';
                case 'AWS_OBJECT_DEST':
                  return 'test/';
                case 'AWS_REGION':
                  return 'local';
                default:
                  '';
              }
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {
            file: {
              createManyAndReturn: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AWSFilesService>(AWSFilesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should upload to S3', async () => {
      const uploadResults = [
        {
          key: 'test/123-foo.txt',
          url: 'https://test.s3.local.amazonaws.com/test/123-foo.txt',
        },
        {
          key: 'test/123-bar.txt',
          url: 'https://test.s3.local.amazonaws.com/test/123-bar.txt',
        },
      ];
      const uploadFilesDto: UploadFileDto[] = [
        {
          path: '/foo',
          mimetype: 'text/plain',
          buffer: Buffer.from('hello'),
          filename: 'foo.txt',
        },
        {
          path: '/bar',
          mimetype: 'text/plain',
          buffer: Buffer.from('world'),
          filename: 'bar.txt',
        },
      ];
      jest.spyOn(prisma.file, 'createManyAndReturn').mockResolvedValue([
        { id: '1', ...uploadResults[0], ...uploadFilesDto[0], isLocal: false },
        { id: '2', ...uploadResults[1], ...uploadFilesDto[2], isLocal: false },
      ]);
      s3Mock.on(CreateMultipartUploadCommand).resolves({ UploadId: '1' });
      s3Mock.on(UploadPartCommand).resolves({ ETag: '1' });
      const ids = await service.upload(uploadFilesDto);
      expect(ids).toEqual(['1', '2']);
    });
  });

  describe('delete', () => {
    let ids: string[];
    beforeEach(() => {
      ids = ['1', '2', '3'];
      s3Mock.on(DeleteObjectsCommand).resolves({
        Deleted: ids.map((k) => ({ Key: k })),
      });
    });

    it('should throw an error if some files are not found', async () => {
      jest.spyOn(prisma.file, 'findMany').mockResolvedValue([
        {
          id: '1',
          isLocal: false,
          key: 'foo',
          path: '/path/to/foo',
          mimetype: 'text/plain',
          filename: 'foo.txt',
          url: 'https://example.com/foo',
        },
      ]);
      expect(service.remove(ids)).rejects.toThrow(BadRequestException);
    });

    it('should delete the file', async () => {
      jest.spyOn(prisma.file, 'findMany').mockResolvedValue([
        {
          id: '1',
          isLocal: false,
          key: 'foo',
          path: '/path/to/foo',
          mimetype: 'text/plain',
          filename: 'foo.txt',
          url: 'https://example.com/foo',
        },
        {
          id: '2',
          isLocal: false,
          key: 'bar',
          path: '/path/to/bar',
          mimetype: 'text/plain',
          filename: 'bar.txt',
          url: 'https://example.com/bar',
        },
        {
          id: '3',
          isLocal: false,
          key: 'baz',
          path: '/path/to/baz',
          mimetype: 'text/plain',
          filename: 'baz.txt',
          url: 'https://example.com/baz',
        },
      ]);
      await service.remove(ids);
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: { key: { in: ['foo', 'bar', 'baz'] }, isLocal: false },
      });
    });
  });
});
