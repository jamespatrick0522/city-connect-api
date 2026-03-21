import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @Length(2, 120)
  city!: string;

  @IsString()
  @Length(3, 180)
  title!: string;

  @IsString()
  @Length(10, 5000)
  content!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class ListAnnouncementsDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
