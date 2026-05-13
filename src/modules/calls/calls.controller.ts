import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CallsService } from './calls.service';
import { EndGuestCallDto, StartGuestCallDto } from './dto/calls.dto';

@ApiTags('Calls')
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('guest/start')
  @ApiOperation({ summary: 'Tourist starts an in-app voice call request to an establishment.' })
  startGuestCall(@Body() payload: StartGuestCallDto) {
    return this.callsService.startGuestCall(payload);
  }

  @Get('guest/:id')
  @ApiOperation({ summary: 'Tourist polls voice call status and receives Agora token after acceptance.' })
  getGuestCall(@Param('id', ParseUUIDPipe) callId: string) {
    return this.callsService.getGuestCall(callId);
  }

  @Post('guest/:id/end')
  @ApiOperation({ summary: 'Tourist ends an in-app voice call.' })
  endGuestCall(@Param('id', ParseUUIDPipe) callId: string, @Body() _payload: EndGuestCallDto) {
    return this.callsService.endGuestCall(callId);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment')
  @ApiOperation({ summary: 'Establishment accepts an incoming in-app voice call.' })
  acceptCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.callsService.acceptCall(callId, currentUser);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment')
  @ApiOperation({ summary: 'Establishment rejects an incoming in-app voice call.' })
  rejectCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.callsService.rejectCall(callId, currentUser);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment')
  @ApiOperation({ summary: 'Establishment ends an active in-app voice call.' })
  endCall(
    @Param('id', ParseUUIDPipe) callId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.callsService.endCallAsEstablishment(callId, currentUser);
  }
}
