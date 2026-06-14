import { Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { AlbumDocument } from '../../domain/album.document';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';
import { EsPagedResult } from './track-es.repository';

const INDEX = 'albums';

export interface AlbumSearchParams {
  q?: string;
  page: number;
  size: number;
}

@Injectable()
export class AlbumEsRepository {
  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  async upsert(doc: AlbumDocument): Promise<void> {
    await this.client.index({
      index: INDEX,
      id: doc.id,
      document: doc,
    });
  }

  async incrTrackCount(albumId: string, albumTitle: string, artist: { id: string; name: string }, coverUrl?: string): Promise<void> {
    await this.client.update({
      index: INDEX,
      id: albumId,
      script: {
        source: 'ctx._source.trackCount += 1',
        lang: 'painless',
      },
      upsert: {
        id: albumId,
        title: albumTitle,
        coverUrl,
        trackCount: 1,
        artist,
      } as AlbumDocument,
    });
  }

  async search(params: AlbumSearchParams): Promise<EsPagedResult<AlbumDocument>> {
    const { q, page, size } = params;

    const queryClause = q
      ? {
          multi_match: {
            query: q,
            fields: ['title^3', 'title.keyword^2', 'artist.name^2'],
            fuzziness: 'AUTO',
            prefix_length: 2,
          },
        }
      : { match_all: {} };

    const result = await this.client.search<AlbumDocument>({
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
}
