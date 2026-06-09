import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@org/ts-common';
import { SearchService } from '../application/search.service';
import {
  AutocompleteQueryDto,
  SearchAllQueryDto,
  SearchArtistsQueryDto,
  SearchTracksQueryDto,
} from './dto/search-query.dto';
import { AutocompleteResponse, PagedResponse, SearchArtistHit, SearchTrackHit, UnifiedSearchResponse } from './dto/search-response.dto';

@Public()
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: SearchAllQueryDto): Promise<UnifiedSearchResponse> {
    return this.searchService.searchAll(query);
  }

  @Get('tracks')
  searchTracks(@Query() query: SearchTracksQueryDto): Promise<PagedResponse<SearchTrackHit>> {
    return this.searchService.searchTracks(query);
  }

  @Get('artists')
  searchArtists(@Query() query: SearchArtistsQueryDto): Promise<PagedResponse<SearchArtistHit>> {
    return this.searchService.searchArtists(query);
  }

  @Get('autocomplete')
  autocomplete(@Query() query: AutocompleteQueryDto): Promise<AutocompleteResponse> {
    return this.searchService.autocomplete(query);
  }
}
