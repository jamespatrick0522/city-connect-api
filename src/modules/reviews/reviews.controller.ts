import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateReviewDto, ListReviewsDto } from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a public review for an establishment.' })
  create(@Body() payload: CreateReviewDto) {
    return this.reviewsService.create(payload);
  }

  @Get()
  @ApiOperation({ summary: 'List public reviews and rating summary for an establishment.' })
  list(@Query() query: ListReviewsDto) {
    return this.reviewsService.list(query);
  }
}
