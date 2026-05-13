import { Module } from '@nestjs/common';

import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { MessagesModule } from '../messages/messages.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsRepository } from './repositories/calls.repository';

@Module({
  imports: [MessagesModule],
  controllers: [CallsController],
  providers: [CallsService, CallsRepository, EstablishmentsRepository],
})
export class CallsModule {}
