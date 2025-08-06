import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import Joi from '@hapi/joi';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from '@nestjs/cache-manager';
import { SettingsModule } from './settings/settings.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.string().required(),
        SESSION_SECRET: Joi.string().required(),
        CORS_ORIGIN: Joi.string().required(),
        MAIL_TRANSPORT: Joi.string().required(),
        CACHE_TTL: Joi.string().required(),
        AWS_REGION: Joi.string().optional(),
        AWS_BUCKET_NAME: Joi.string().optional(),
        AWS_OBJECT_DEST: Joi.string().optional(),
        UPLOADED_DEST: Joi.string().optional(),
      }),
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('CACHE_TTL'),
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
      }),
    }),
    UsersModule,
    MailModule,
    SettingsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
