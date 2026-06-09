import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { TrackDocument } from '../../domain/track.document';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';

const INDEX = 'tracks';

export interface TrackSearchParams {
  q?: string;
  genre?: string;
  artistId?: string;
  sort?: 'relevance' | 'newest' | 'popular';
  page: number;
  size: number;
}

export interface EsPagedResult<T> {
  items: T[];
  total: number;
  maxScore: number | null;
}

function buildSort(sort?: string): Array<Record<string, unknown>> {
  switch (sort) {
    case 'newest':
      return [{ createdAt: { order: 'desc' } }, { _score: { order: 'desc' } }];
    case 'popular':
      return [{ playCount: { order: 'desc' } }, { _score: { order: 'desc' } }];
    default:
      return [{ _score: { order: 'desc' } }];
  }
}

@Injectable()
export class TrackEsRepository {
  private readonly logger = new Logger(TrackEsRepository.name);

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  async upsert(doc: TrackDocument): Promise<void> {
    await this.client.index({
      index: INDEX,
      id: doc.id,
      document: doc,
    });
  }

  async partialUpdate(id: string, partial: Partial<TrackDocument>): Promise<void> {
    await this.client.update({
      index: INDEX,
      id,
      doc: partial,
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.delete({ index: INDEX, id });
    } catch (err: unknown) {
      const asAny = err as { meta?: { statusCode?: number } };
      if (asAny?.meta?.statusCode === 404) return;
      throw err;
    }
  }

  async search(params: TrackSearchParams): Promise<EsPagedResult<TrackDocument>> {
    const { q, genre, artistId, sort, page, size } = params;

    const filters: Array<Record<string, unknown>> = [{ term: { status: 'PUBLISHED' } }];
    if (genre) filters.push({ term: { genre } });
    if (artistId) filters.push({ term: { 'artist.id': artistId } });

    const mustClause = q
      ? [
          {
            multi_match: {
              query: q,
              fields: ['title^3', 'title.keyword^2', 'artist.name^2', 'album.title'],
              fuzziness: 'AUTO',
              prefix_length: 2,
              operator: 'or',
            },
          },
        ]
      : [{ match_all: {} }];

    const result = await this.client.search<TrackDocument>({
      index: INDEX,
      from: page * size,
      size,
      query: {
        bool: {
          must: mustClause,
          filter: filters,
        },
      },
      sort: buildSort(sort),
    });

    const hits = result.hits.hits;
    return {
      items: hits.map((h) => ({ ...h._source! })),
      total: typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value ?? 0),
      maxScore: result.hits.max_score ?? null,
    };
  }

  async autocomplete(prefix: string, size: number): Promise<Array<{ text: string; id: string; coverUrl?: string }>> {
    const result = await this.client.search({
      index: INDEX,
      size: 0,
      suggest: {
        track_suggest: {
          prefix,
          completion: {
            field: 'title.suggest',
            size,
            fuzzy: { fuzziness: 1 },
          },
        },
      } as Record<string, unknown>,
    });

    const options = (result.suggest?.['track_suggest'] as Array<{ options: Array<{ text: string; _id: string; _source: TrackDocument }> }> | undefined)?.[0]?.options ?? [];
    return options.map((o) => ({
      text: o.text,
      id: o._source?.id ?? o._id,
      coverUrl: o._source?.coverUrl,
    }));
  }
}
