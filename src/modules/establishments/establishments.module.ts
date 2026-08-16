import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import {
  CloudinaryGalleryImageUploadMiddleware,
  CloudinaryUploadMiddleware,
  CloudinaryVideoUploadMiddleware,
} from '../../common/cloudinary/cloudinary-upload.middleware';
import { EstablishmentsController } from './establishments.controller';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentMediaRepository } from './repositories/establishment-media.repository';
import { EstablishmentsRepository } from './repositories/establishments.repository';

@Module({
  controllers: [EstablishmentsController],
  providers: [
    EstablishmentsService,
    EstablishmentsRepository,
    EstablishmentMediaRepository,
    CloudinaryUploadMiddleware,
    CloudinaryGalleryImageUploadMiddleware,
    CloudinaryVideoUploadMiddleware,
  ],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CloudinaryUploadMiddleware)
      .forRoutes({ path: 'establishments/:id/cover-photo', method: RequestMethod.POST });

    consumer
      .apply(CloudinaryGalleryImageUploadMiddleware)
      .forRoutes({ path: 'establishments/:id/gallery-images', method: RequestMethod.POST });

    consumer
      .apply(CloudinaryVideoUploadMiddleware)
      .forRoutes({ path: 'establishments/:id/location-video', method: RequestMethod.POST });
  }
}


