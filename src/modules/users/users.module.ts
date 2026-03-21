import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { CloudinaryUploadMiddleware } from '../../common/cloudinary/cloudinary-upload.middleware';
import { UsersController } from './users.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, CloudinaryUploadMiddleware],
  exports: [UsersService],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CloudinaryUploadMiddleware)
      .forRoutes({ path: 'users/:id/avatar', method: RequestMethod.POST });
  }
}

