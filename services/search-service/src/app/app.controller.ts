import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('v1/search')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  search(@Query('q') q: string, @Query('type') type?: string) {
    return this.appService.search(q, type);
  }

  @Get('tracks')
  searchTracks(
    @Query('q') q: string,
    @Query('sort') sort?: string,
    @Query('page') page = 0,
    @Query('size') size = 20,
  ) {
    return this.appService.searchTracks(q, sort, +page, +size);
  }

  @Get('artists')
  searchArtists(@Query('q') q: string, @Query('page') page = 0) {
    return this.appService.searchArtists(q, +page);
  }

  @Get('albums')
  searchAlbums(@Query('q') q: string, @Query('page') page = 0) {
    return this.appService.searchAlbums(q, +page);
  }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return this.appService.autocomplete(q);
  }
}
