import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { CloudinaryUploadMiddleware } from '../../common/cloudinary/cloudinary-upload.middleware';
import { EstablishmentsController } from './establishments.controller';
import { EstablishmentsService } from './establishments.service';
import { EstablishmentsRepository } from './repositories/establishments.repository';

@Module({
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, EstablishmentsRepository, CloudinaryUploadMiddleware],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CloudinaryUploadMiddleware)
      .forRoutes({ path: 'establishments/:id/cover-photo', method: RequestMethod.POST });
  }
}
