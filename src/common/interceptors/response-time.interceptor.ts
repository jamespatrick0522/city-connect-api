import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';

import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.debug(
          `${request.method} ${request.url} handled in ${duration}ms`,
          'ResponseTimeInterceptor',
        );
      }),
    );
  }
}

