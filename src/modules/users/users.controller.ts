import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CreateUserDto } from './dto/create-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user.' })
  create(@Body() payload: CreateUserDto) {
    return this.usersService.createUser(payload);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id.' })
  getById(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Search users and return cached results with pagination.' })
  search(@Query() query: SearchUsersDto) {
    return this.usersService.searchUsers(query);
  }

  @Post(':id/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary' },
      },
      required: ['photo'],
    },
  })
  @ApiOperation({ summary: 'Upload user avatar to Cloudinary via middleware.' })
  uploadAvatar(@Param('id', ParseUUIDPipe) userId: string, @Req() req: Request) {
    if (!req.cloudinaryAsset?.secure_url) {
      throw new BadRequestException('No image uploaded. Use form-data key "photo".');
    }

    return this.usersService.uploadAvatar(userId, req.cloudinaryAsset.secure_url);
  }
}

