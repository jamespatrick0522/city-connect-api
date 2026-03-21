import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SendGuestMessageDto {
  @IsUUID()
  establishmentId!: string;

  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(7, 30)
  phone?: string;

  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientRequestId?: string;
}

export class GetGuestThreadDto {
  @IsString()
  @Length(20, 1000)
  conversationToken!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;
}

export class ReplyToGuestDto {
  @IsUUID()
  establishmentId!: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @Length(7, 30)
  guestPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guestFullName?: string;

  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientRequestId?: string;
}

export class ListGuestConversationDto {
  @IsUUID()
  establishmentId!: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @Length(7, 30)
  guestPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;
}

export class ListConversationsDto {
  @IsUUID()
  establishmentId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 30;
}
