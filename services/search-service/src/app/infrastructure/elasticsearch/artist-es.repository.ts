import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ArtistDocument } from '../../domain/artist.document';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';
import { EsPagedResult } from './track-es.repository';

const INDEX = 'artists';

export interface ArtistSearchParams {
  q?: string;
  page: number;
  size: number;
}

@Injectable()
export class ArtistEsRepository {
  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  async upsert(doc: ArtistDocument): Promise<void> {
    await this.client.index({
      index: INDEX,
      id: doc.id,
      document: doc,
    });
  }

  async incrTrackCount(artistId: string, artistName: string, genre: string): Promise<void> {
    await this.client.update({
      index: INDEX,
      id: artistId,
      script: {
        source: 'ctx._source.trackCount += 1; if (!ctx._source.genreTags.contains(params.genre)) { ctx._source.genreTags.add(params.genre); }',
        lang: 'painless',
        params: { genre },
      },
      upsert: {
        id: artistId,
        name: artistName,
        trackCount: 1,
        genreTags: genre ? [genre] : [],
      } as ArtistDocument,
    });
  }

  async search(params: ArtistSearchParams): Promise<EsPagedResult<ArtistDocument>> {
    const { q, page, size } = params;

    const queryClause = q
      ? {
          multi_match: {
            query: q,
            fields: ['name^3', 'name.keyword^2', 'genreTags'],
            fuzziness: 'AUTO',
            prefix_length: 2,
          },
        }
      : { match_all: {} };

    const result = await this.client.search<ArtistDocument>({
      index: INDEX,
      from: page * size,
      size,
      query: queryClause,
      sort: [{ _score: { order: 'desc' } }],
    });

    const hits = result.hits.hits;
    return {
      items: hits.map((h) => ({ ...h._source! })),
      total: typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value ?? 0),
      maxScore: result.hits.max_score ?? null,
    };
  }

  async autocomplete(prefix: string, size: number): Promise<Array<{ text: string; id: string; avatarUrl?: string }>> {
    const result = await this.client.search({
      index: INDEX,
      size: 0,
      suggest: {
        artist_suggest: {
          prefix,
          completion: {
            field: 'name.suggest',
            size,
            fuzzy: { fuzziness: 1 },
          },
        },
      } as any,
    });

    const options = (result.suggest?.['artist_suggest'] as Array<{ options: Array<{ text: string; _id: string; _source: ArtistDocument }> }> | undefined)?.[0]?.options ?? [];
    return options.map((o) => ({
      text: o.text,
      id: o._source?.id ?? o._id,
      avatarUrl: o._source?.avatarUrl,
    }));
  }
}
