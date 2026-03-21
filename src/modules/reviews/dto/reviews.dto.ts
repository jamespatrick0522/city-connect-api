import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

const REVIEW_SORT_VALUES = ['recent', 'highest', 'lowest'] as const;

export class CreateReviewDto {
  @IsUUID()
  establishmentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @Length(3, 2000)
  comment!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  reviewerName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  reviewerAlias?: string;
}

export class ListReviewsDto {
  @IsUUID()
  establishmentId!: string;

  @IsOptional()
  @IsIn(REVIEW_SORT_VALUES)
  sort: (typeof REVIEW_SORT_VALUES)[number] = 'recent';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}
