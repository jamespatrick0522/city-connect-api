import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AdminService, type AdminDashboardData } from './admin.service';
import { GetAdminDashboardDto } from './dto/dashboard.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lgu_admin')
  @ApiOperation({
    summary: 'LGU admin dashboard metrics and recent moderation items in one request.',
  })
  getDashboard(@Query() query: GetAdminDashboardDto): Promise<AdminDashboardData> {
    return this.adminService.getDashboard(query);
  }
}
