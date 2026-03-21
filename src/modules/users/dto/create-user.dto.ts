import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { userRoleEnum } from '../../../common/database/schema/users.schema';

const USER_ROLES = userRoleEnum.enumValues;

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(2, 120)
  firstName!: string;

  @IsString()
  @Length(2, 120)
  lastName!: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
