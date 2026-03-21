import { Injectable, NotFoundException } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateReportDto, ListReportsDto, ResolveReportDto } from './dto/reports.dto';
import { ReportsRepository } from './repositories/reports.repository';

@Injectable()
export class ReportsService {
  constructor(private readonly reportsRepository: ReportsRepository) {}

  create(payload: CreateReportDto, currentUser: AuthenticatedUser | null) {
    return this.reportsRepository.create({
      ...payload,
      reporterUserId: currentUser?.userId ?? null,
      status: 'open',
      updatedAt: new Date(),
    });
  }

  list(query: ListReportsDto) {
    return this.reportsRepository.list(query.status, query.limit);
  }

  async resolve(reportId: string, _payload: ResolveReportDto, currentUser: AuthenticatedUser) {
    const updated = await this.reportsRepository.resolve(reportId, currentUser.userId);

    if (!updated) {
      throw new NotFoundException('Report not found.');
    }

    return updated;
  }
}
