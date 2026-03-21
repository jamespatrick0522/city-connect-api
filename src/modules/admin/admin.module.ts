import { Module } from '@nestjs/common';

import { AnnouncementsRepository } from '../announcements/repositories/announcements.repository';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { ReportsRepository } from '../reports/repositories/reports.repository';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    EstablishmentsRepository,
    ReportsRepository,
    AnnouncementsRepository,
  ],
})
export class AdminModule {}

