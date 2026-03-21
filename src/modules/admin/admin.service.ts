import { Injectable } from '@nestjs/common';

import { RedisService } from '../../common/redis/redis.service';
import { AnnouncementsRepository } from '../announcements/repositories/announcements.repository';
import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { ReportsRepository } from '../reports/repositories/reports.repository';
import { GetAdminDashboardDto } from './dto/dashboard.dto';

export interface AdminDashboardData {
  generatedAt: string;
  metrics: {
    pendingEstablishments: number;
    verifiedEstablishments: number;
    openReports: number;
    activeAnnouncements: number;
  };
  recent: {
    pendingEstablishments: Awaited<ReturnType<EstablishmentsRepository['search']>>['data'];
    openReports: Awaited<ReturnType<ReportsRepository['list']>>;
    announcements: Awaited<ReturnType<AnnouncementsRepository['list']>>;
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly establishmentsRepository: EstablishmentsRepository,
    private readonly reportsRepository: ReportsRepository,
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly redisService: RedisService,
  ) {}

  async getDashboard(query: GetAdminDashboardDto): Promise<AdminDashboardData> {
    const city = query.city?.trim() || undefined;
    const recentLimit = Math.max(1, Math.min(20, query.recentLimit || 5));
    const cacheKey = `admin:dashboard:${city ?? 'all'}:${recentLimit}`;

    const cached = await this.redisService.getJson<AdminDashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    const [pendingEstablishments, verifiedEstablishments, openReports, activeAnnouncements] =
      await Promise.all([
        this.establishmentsRepository.countByListingStatus('pending', city),
        this.establishmentsRepository.countByListingStatus('verified', city),
        this.reportsRepository.countByStatus('open'),
        this.announcementsRepository.countActive(city),
      ]);

    const [recentPendingEstablishments, recentOpenReports, recentAnnouncements] = await Promise.all([
      this.establishmentsRepository.search({
        city,
        listingStatus: 'pending',
        page: 1,
        pageSize: recentLimit,
      }),
      this.reportsRepository.list('open', recentLimit),
      this.announcementsRepository.list(city, recentLimit),
    ]);

    const payload: AdminDashboardData = {
      generatedAt: new Date().toISOString(),
      metrics: {
        pendingEstablishments,
        verifiedEstablishments,
        openReports,
        activeAnnouncements,
      },
      recent: {
        pendingEstablishments: recentPendingEstablishments.data,
        openReports: recentOpenReports,
        announcements: recentAnnouncements,
      },
    };

    await this.redisService.setJson(cacheKey, payload, 20);
    return payload;
  }
}
