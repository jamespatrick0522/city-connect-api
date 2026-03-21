import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService implements LoggerService {
  private format(level: string, message: string, context?: string, meta?: unknown): string {
    return JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
      context,
      message,
      ...(meta ? { meta } : {}),
    });
  }

  log(message: string, context?: string): void {
    console.log(this.format('log', message, context));
  }

  error(message: string, trace?: string, context?: string): void {
    console.error(this.format('error', message, context, trace ? { trace } : undefined));
  }

  warn(message: string, context?: string): void {
    console.warn(this.format('warn', message, context));
  }

  debug(message: string, context?: string): void {
    console.debug(this.format('debug', message, context));
  }

  verbose(message: string, context?: string): void {
    console.info(this.format('verbose', message, context));
  }
}
