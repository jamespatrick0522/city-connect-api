import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

const REPORT_STATUSES = ['open', 'resolved'] as const;

export class CreateReportDto {
  @IsUUID()
  establishmentId!: string;

  @IsString()
  @Length(3, 120)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(5, 3000)
  details?: string;
}

export class ListReportsDto {
  @IsOptional()
  @IsIn(REPORT_STATUSES)
  status?: (typeof REPORT_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ResolveReportDto {
  // Empty body is allowed for resolve action; actor comes from JWT.
}
