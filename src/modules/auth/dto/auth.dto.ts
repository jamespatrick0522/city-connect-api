import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterEstablishmentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 120)
  firstName!: string;

  @IsString()
  @Length(2, 120)
  lastName!: string;

  @IsString()
  @Length(8, 100)
  password!: string;
}

export class RegisterLguAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 120)
  firstName!: string;

  @IsString()
  @Length(2, 120)
  lastName!: string;

  @IsString()
  @Length(8, 100)
  password!: string;

  @IsString()
  @Length(8, 200)
  registerCode!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 100)
  password!: string;
}
