import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CreateEstablishmentDto,
  ListMyEstablishmentsDto,
  SearchEstablishmentsDto,
  UpdateEstablishmentLocationDto,
  UpdateEstablishmentStatusDto,
  VerifyEstablishmentDto,
} from './dto/establishments.dto';
import { EstablishmentsService } from './establishments.service';

@ApiTags('Establishments')
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment')
  @ApiOperation({ summary: 'Register/claim an establishment listing (pending verification).' })
  create(@Body() payload: CreateEstablishmentDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.establishmentsService.register(payload, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Search/filter establishments (city/category/open/listing status).' })
  search(@Query() query: SearchEstablishmentsDto) {
    return this.establishmentsService.search(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'List establishments owned by current authenticated establishment account.' })
  listMine(@Query() query: ListMyEstablishmentsDto, @CurrentUser() currentUser: AuthenticatedUser) {
    return this.establishmentsService.listMine(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get establishment details by id.' })
  getById(@Param('id', ParseUUIDPipe) establishmentId: string) {
    return this.establishmentsService.findById(establishmentId);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('lgu_admin')
  @ApiOperation({ summary: 'LGU verifies/rejects a listing.' })
  verify(
    @Param('id', ParseUUIDPipe) establishmentId: string,
    @Body() payload: VerifyEstablishmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.establishmentsService.verify(establishmentId, payload, currentUser);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'Establishment updates open/closed status and notes.' })
  updateStatus(
    @Param('id', ParseUUIDPipe) establishmentId: string,
    @Body() payload: UpdateEstablishmentStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.establishmentsService.updateStatus(establishmentId, payload, currentUser);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
  @ApiOperation({ summary: 'Establishment or LGU admin updates the public map location.' })
  updateLocation(
    @Param('id', ParseUUIDPipe) establishmentId: string,
    @Body() payload: UpdateEstablishmentLocationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.establishmentsService.updateLocation(establishmentId, payload, currentUser);
  }

  @Post(':id/cover-photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('establishment', 'lgu_admin')
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
  @ApiOperation({ summary: 'Upload establishment cover photo via Cloudinary middleware.' })
  uploadCoverPhoto(
    @Param('id', ParseUUIDPipe) establishmentId: string,
    @Req() req: Request,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (!req.cloudinaryAsset?.secure_url) {
      throw new BadRequestException('No image uploaded. Use form-data key "photo".');
    }

    return this.establishmentsService.updateCoverPhoto(
      establishmentId,
      req.cloudinaryAsset.secure_url,
      currentUser,
    );
  }
}
