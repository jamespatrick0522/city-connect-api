import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateFavoriteDto, ListFavoritesDto } from './dto/favorites.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Save an establishment to favorites.' })
  create(@Body() payload: CreateFavoriteDto) {
    return this.favoritesService.create(payload);
  }

  @Get()
  @ApiOperation({ summary: 'List favorites of a user.' })
  listByUser(@Query() query: ListFavoritesDto) {
    return this.favoritesService.listByUser(query);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a favorite.' })
  remove(@Param('id', ParseUUIDPipe) favoriteId: string) {
    return this.favoritesService.remove(favoriteId);
  }
}
