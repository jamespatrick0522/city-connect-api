import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import configuration from './common/config/configuration';
import { envValidationSchema } from './common/config/env.validation';
import { DatabaseModule } from './common/database/database.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTimeInterceptor } from './common/interceptors/response-time.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { RequestLoggerMiddleware } from './common/logger/request-logger.middleware';
import { RedisModule } from './common/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AuthModule } from './modules/auth/auth.module';
import { CallsModule } from './modules/calls/calls.module';
import { EstablishmentsModule } from './modules/establishments/establishments.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    CloudinaryModule,
    AdminModule,
    AnnouncementsModule,
    AuthModule,
    CallsModule,
    EstablishmentsModule,
    FavoritesModule,
    HealthModule,
    MessagesModule,
    ReportsModule,
    ReviewsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
