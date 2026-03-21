import { Module } from '@nestjs/common';

import { EstablishmentsRepository } from '../establishments/repositories/establishments.repository';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './repositories/reviews.repository';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository, EstablishmentsRepository],
})
export class ReviewsModule {}
