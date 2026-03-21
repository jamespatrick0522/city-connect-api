import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateReportDto, ListReportsDto, ResolveReportDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report for spam/fake/inappropriate listing.' })
  create(@Body() payload: CreateReportDto) {
    return this.reportsService.create(payload, null);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lgu_admin')
  @ApiOperation({ summary: 'List reports for LGU moderation.' })
  list(@Query() query: ListReportsDto) {
    return this.reportsService.list(query);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lgu_admin')
  @ApiOperation({ summary: 'Resolve a report (LGU admin action).' })
  resolve(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() payload: ResolveReportDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.reportsService.resolve(reportId, payload, currentUser);
  }
}
