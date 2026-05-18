import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

import {
  businessStatusEnum,
  establishmentCategoryEnum,
  listingStatusEnum,
} from '../../../common/database/schema/establishments.schema';

const CATEGORIES = establishmentCategoryEnum.enumValues;
const LISTING_STATUSES = listingStatusEnum.enumValues;
const BUSINESS_STATUSES = businessStatusEnum.enumValues;

export class CreateEstablishmentDto {
  @IsString()
  @Length(2, 120)
  city!: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsString()
  @Length(5, 255)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  services?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  opensAt?: string;

  @IsOptional()
  @IsString()
  closesAt?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOpenNow?: boolean;
}

export class SearchEstablishmentsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  openNow?: boolean;

  @IsOptional()
  @IsIn(LISTING_STATUSES)
  listingStatus?: (typeof LISTING_STATUSES)[number];

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
  pageSize = 12;
}

export class ListMyEstablishmentsDto {
  @IsOptional()
  @IsIn(LISTING_STATUSES)
  listingStatus?: (typeof LISTING_STATUSES)[number];

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
  pageSize = 12;
}

export class VerifyEstablishmentDto {
  @IsIn(LISTING_STATUSES)
  listingStatus!: (typeof LISTING_STATUSES)[number];
}

export class UpdateEstablishmentStatusDto {
  @IsOptional()
  @IsIn(BUSINESS_STATUSES)
  businessStatus?: (typeof BUSINESS_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOpenNow?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  statusNote?: string;
}

export class UpdateEstablishmentLocationDto {
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  address?: string;
}
