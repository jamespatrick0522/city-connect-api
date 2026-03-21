import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  GetGuestThreadDto,
  ListConversationsDto,
  ListGuestConversationDto,
  ReplyToGuestDto,
  SendGuestMessageDto,
} from './dto/messages.dto';
import { MessagesService, type ConversationSummary } from './messages.service';

@ApiTags('Messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('guest')
  @ApiOperation({
    summary:
      'Tourist guest sends a message without login (requires full name and at least email or phone).',
  })
  sendGuestMessage(@Body() payload: SendGuestMessageDto) {
    return this.messagesService.sendGuestMessage(payload);
  }

  @Get('guest-thread')
  @ApiOperation({ summary: 'List a guest conversation thread using a signed conversation token.' })
  listGuestThread(@Query() query: GetGuestThreadDto) {
    return this.messagesService.listGuestThread(query);
  }

  @Post('reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'Establishment/LGU replies to a guest conversation.' })
  replyToGuest(@Body() payload: ReplyToGuestDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.messagesService.replyToGuest(payload, currentUser);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'List inquiry conversation threads for an establishment inbox.' })
  listConversations(
    @Query() query: ListConversationsDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    data: ConversationSummary[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    return this.messagesService.listConversations(query, currentUser);
  }

  @Get('guest-conversation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'List guest conversation messages for an establishment.' })
  listGuestConversation(
    @Query() query: ListGuestConversationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.messagesService.listGuestConversation(query, currentUser);
  }
}
