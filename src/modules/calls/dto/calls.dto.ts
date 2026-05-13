import { IsEmail, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class StartGuestCallDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientRequestId?: string;
}

export class EndGuestCallDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;
}
