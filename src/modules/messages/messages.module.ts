import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersRepository } from '../users/repositories/users.repository';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { ChatGateway } from './chat.gateway';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './repositories/messages.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('app.auth.jwtSecret'),
      }),
    }),
  ],
  controllers: [MessagesController],
  providers: [
    MessagesService,
    MessagesRepository,
    EstablishmentsRepository,
    UsersRepository,
    ChatGateway,
  ],
})
export class MessagesModule {}
