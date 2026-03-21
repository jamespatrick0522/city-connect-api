import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { AppLoggerService } from './app-logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    request.id = request.headers['x-request-id']?.toString() || uuidv4();
    response.setHeader('x-request-id', request.id);

    const start = Date.now();

    response.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms`,
        'RequestLoggerMiddleware',
      );
    });

    next();
  }
}

