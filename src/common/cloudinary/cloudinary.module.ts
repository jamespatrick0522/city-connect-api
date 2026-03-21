import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { TOKENS } from '../constants/tokens';
import { CloudinaryService } from './cloudinary.service';

@Global()
@Module({
  providers: [
    {
      provide: TOKENS.CLOUDINARY_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): typeof cloudinary => {
        cloudinary.config({
          cloud_name: configService.getOrThrow<string>('app.cloudinary.cloudName'),
          api_key: configService.getOrThrow<string>('app.cloudinary.apiKey'),
          api_secret: configService.getOrThrow<string>('app.cloudinary.apiSecret'),
          secure: true,
        });

        return cloudinary;
      },
    },
    CloudinaryService,
  ],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}

