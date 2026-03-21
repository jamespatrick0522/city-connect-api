import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { CreateReviewDto, ListReviewsDto } from './dto/reviews.dto';
import { ReviewsRepository } from './repositories/reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly establishmentsRepository: EstablishmentsRepository,
  ) {}

  async create(payload: CreateReviewDto) {
    const establishment = await this.establishmentsRepository.findById(payload.establishmentId);
    if (!establishment || establishment.listingStatus !== 'verified') {
      throw new NotFoundException('Establishment not found.');
    }

    if (!payload.isAnonymous && !payload.reviewerName?.trim()) {
      throw new BadRequestException('Reviewer name is required unless the review is anonymous.');
    }

    const review = await this.reviewsRepository.create({
      establishmentId: payload.establishmentId,
      rating: payload.rating,
      comment: payload.comment.trim(),
      reviewerName: payload.isAnonymous ? null : payload.reviewerName?.trim() ?? null,
      reviewerAlias: payload.isAnonymous ? payload.reviewerAlias?.trim() ?? null : null,
      isAnonymous: payload.isAnonymous ?? false,
      updatedAt: new Date(),
    });

    return this.mapReview(review);
  }

  async list(query: ListReviewsDto) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 10));
    const offset = (page - 1) * pageSize;

    const [rows, total, summary] = await Promise.all([
      this.reviewsRepository.listByEstablishment(query.establishmentId, {
        sort: query.sort,
        limit: pageSize,
        offset,
      }),
      this.reviewsRepository.countByEstablishment(query.establishmentId),
      this.reviewsRepository.getSummary(query.establishmentId),
    ]);

    return {
      data: rows.map((row) => this.mapReview(row)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      summary,
    };
  }

  private mapReview(review: {
    id: string;
    establishmentId: string;
    reviewerName: string | null;
    reviewerAlias: string | null;
    isAnonymous: boolean;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const displayName = review.isAnonymous
      ? review.reviewerAlias?.trim() || 'Anonymous Visitor'
      : review.reviewerName?.trim() || 'Visitor';

    return {
      ...review,
      displayName,
    };
  }
}
