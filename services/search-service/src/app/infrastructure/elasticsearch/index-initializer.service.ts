import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';

const TRACKS_INDEX = 'tracks';
const ARTISTS_INDEX = 'artists';

@Injectable()
export class IndexInitializerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IndexInitializerService.name);

  constructor(@Inject(ELASTICSEARCH_CLIENT) private readonly client: Client) {}

  async onApplicationBootstrap(): Promise<void> {
    const useIcu = await this.detectIcuPlugin();
    if (!useIcu) {
      this.logger.warn('analysis-icu plugin not found — using standard analyzer fallback');
    }
    await this.ensureTracksIndex(useIcu);
    await this.ensureArtistsIndex(useIcu);
  }

  private async detectIcuPlugin(): Promise<boolean> {
    try {
      const plugins = await this.client.cat.plugins({ format: 'json' });
      const list = plugins as unknown as Array<{ component: string }>;
      return list.some((p) => p.component === 'analysis-icu');
    } catch {
      return false;
    }
  }

  private buildAnalysisSettings(useIcu: boolean) {
    if (useIcu) {
      return {
        analysis: {
          analyzer: {
            vietnamese: {
              type: 'custom',
              tokenizer: 'icu_tokenizer',
              filter: ['icu_folding', 'lowercase'],
            },
          },
        },
      };
    }
    return {
      analysis: {
        analyzer: {
          vietnamese: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase'],
          },
        },
      },
    };
  }

  private async ensureTracksIndex(useIcu: boolean): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: TRACKS_INDEX });
      if (exists) {
        this.logger.log(`Index '${TRACKS_INDEX}' already exists — skipping creation`);
        return;
      }
      await this.client.indices.create({
        index: TRACKS_INDEX,
        settings: this.buildAnalysisSettings(useIcu),
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: {
              type: 'text',
              analyzer: 'vietnamese',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion', analyzer: 'vietnamese' },
              },
            },
            genre: { type: 'keyword' },
            durationMs: { type: 'integer' },
            coverUrl: { type: 'keyword', index: false, doc_values: false },
            playCount: { type: 'long' },
            status: { type: 'keyword' },
            releaseDate: { type: 'date' },
            createdAt: { type: 'date' },
            artist: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'vietnamese',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'completion', analyzer: 'vietnamese' },
                  },
                },
              },
            },
            album: {
              properties: {
                id: { type: 'keyword' },
                title: { type: 'text', analyzer: 'vietnamese' },
              },
            },
          },
        },
      });
      this.logger.log(`Index '${TRACKS_INDEX}' created`);
    } catch (err: unknown) {
      this.logger.error(`Failed to create index '${TRACKS_INDEX}': ${String(err)}`);
    }
  }

  private async ensureArtistsIndex(useIcu: boolean): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: ARTISTS_INDEX });
      if (exists) {
        this.logger.log(`Index '${ARTISTS_INDEX}' already exists — skipping creation`);
        return;
      }
      await this.client.indices.create({
        index: ARTISTS_INDEX,
        settings: this.buildAnalysisSettings(useIcu),
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'vietnamese',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion', analyzer: 'vietnamese' },
              },
            },
            avatarUrl: { type: 'keyword', index: false, doc_values: false },
            trackCount: { type: 'integer' },
            genreTags: { type: 'keyword' },
          },
        },
      });
      this.logger.log(`Index '${ARTISTS_INDEX}' created`);
    } catch (err: unknown) {
      this.logger.error(`Failed to create index '${ARTISTS_INDEX}': ${String(err)}`);
    }
  }
}
