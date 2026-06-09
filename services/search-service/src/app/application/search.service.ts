import { Injectable } from '@nestjs/common';
import { TrackDocument } from '../domain/track.document';
import { ArtistDocument } from '../domain/artist.document';
import { TrackEsRepository } from '../infrastructure/elasticsearch/track-es.repository';
import { ArtistEsRepository } from '../infrastructure/elasticsearch/artist-es.repository';
import {
  SearchAllQueryDto,
  SearchTracksQueryDto,
  SearchArtistsQueryDto,
  AutocompleteQueryDto,
} from '../presentation/dto/search-query.dto';
import {
  AutocompleteResponse,
  PagedResponse,
  SearchArtistHit,
  SearchTrackHit,
  UnifiedSearchResponse,
} from '../presentation/dto/search-response.dto';

@Injectable()
export class SearchService {
  constructor(
    private readonly trackRepo: TrackEsRepository,
    private readonly artistRepo: ArtistEsRepository,
  ) {}

  async searchAll(query: SearchAllQueryDto): Promise<UnifiedSearchResponse> {
    const { q, page = 0, size = 20 } = query;
    const start = Date.now();

    const [trackResult, artistResult] = await Promise.all([
      this.trackRepo.search({ q, page, size }),
      this.artistRepo.search({ q, page, size }),
    ]);

    return {
      tracks: {
        items: trackResult.items.map(toTrackHit),
        total: trackResult.total,
      },
      artists: {
        items: artistResult.items.map(toArtistHit),
        total: artistResult.total,
      },
      totalResults: trackResult.total + artistResult.total,
      queryTimeMs: Date.now() - start,
    };
  }

  async searchTracks(query: SearchTracksQueryDto): Promise<PagedResponse<SearchTrackHit>> {
    const { q, genre, artistId, sort, page = 0, size = 20 } = query;
    const start = Date.now();

    const result = await this.trackRepo.search({ q, genre, artistId, sort, page, size });

    return {
      content: result.items.map(toTrackHit),
      page,
      size,
      totalElements: result.total,
      totalPages: Math.ceil(result.total / size),
      queryTimeMs: Date.now() - start,
    };
  }

  async searchArtists(query: SearchArtistsQueryDto): Promise<PagedResponse<SearchArtistHit>> {
    const { q, page = 0, size = 20 } = query;
    const start = Date.now();

    const result = await this.artistRepo.search({ q, page, size });

    return {
      content: result.items.map(toArtistHit),
      page,
      size,
      totalElements: result.total,
      totalPages: Math.ceil(result.total / size),
      queryTimeMs: Date.now() - start,
    };
  }

  async autocomplete(query: AutocompleteQueryDto): Promise<AutocompleteResponse> {
    const { q, limit = 5 } = query;

    const [trackSuggestions, artistSuggestions] = await Promise.all([
      this.trackRepo.autocomplete(q, limit),
      this.artistRepo.autocomplete(q, limit),
    ]);

    const suggestions = [
      ...trackSuggestions.map((s) => ({ text: s.text, type: 'track' as const, id: s.id, imageUrl: s.coverUrl })),
      ...artistSuggestions.map((s) => ({ text: s.text, type: 'artist' as const, id: s.id, imageUrl: s.avatarUrl })),
    ]
      .sort((a, b) => a.text.localeCompare(b.text))
      .slice(0, limit);

    return { suggestions };
  }
}

function toTrackHit(doc: TrackDocument): SearchTrackHit {
  return {
    id: doc.id,
    title: doc.title,
    genre: doc.genre,
    durationMs: doc.durationMs,
    coverUrl: doc.coverUrl,
    playCount: doc.playCount,
    artist: doc.artist,
    album: doc.album,
    score: 0,
  };
}

function toArtistHit(doc: ArtistDocument): SearchArtistHit {
  return {
    id: doc.id,
    name: doc.name,
    avatarUrl: doc.avatarUrl,
    trackCount: doc.trackCount,
    genreTags: doc.genreTags,
    score: 0,
  };
}
