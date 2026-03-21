import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAnnouncementDto, ListAnnouncementsDto } from './dto/announcements.dto';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lgu_admin')
  @ApiOperation({ summary: 'Publish LGU announcement/advisory.' })
  create(@Body() payload: CreateAnnouncementDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.announcementsService.create(payload, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List active announcements/advisories.' })
  list(@Query() query: ListAnnouncementsDto) {
    return this.announcementsService.list(query);
  }
}
