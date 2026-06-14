import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { IndexInitializerService } from './index-initializer.service';
import { TrackEsRepository } from './track-es.repository';
import { ArtistEsRepository } from './artist-es.repository';
import { AlbumEsRepository } from './album-es.repository';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';

export { ELASTICSEARCH_CLIENT } from './elasticsearch.tokens';

@Module({
  providers: [
    {
      provide: ELASTICSEARCH_CLIENT,
      useFactory: (config: ConfigService) => {
        const node = config.get<string>('elasticsearch.node')!;
        const username = config.get<string | undefined>('elasticsearch.username');
        const password = config.get<string | undefined>('elasticsearch.password');
        return new Client({
          node,
          ...(username && password ? { auth: { username, password } } : {}),
        });
      },
      inject: [ConfigService],
    },
    IndexInitializerService,
    TrackEsRepository,
    ArtistEsRepository,
    AlbumEsRepository,
  ],
  exports: [TrackEsRepository, ArtistEsRepository, AlbumEsRepository],
})
export class ElasticsearchModule {}
