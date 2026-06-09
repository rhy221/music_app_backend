import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXCHANGES } from '@org/music-events';
import { HealthModule, LoggingModule, MetricsModule, RabbitMQModule } from '@org/ts-common';
import configuration from './config/configuration';
import { ElasticsearchModule } from './infrastructure/elasticsearch/elasticsearch.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { SearchModule } from './presentation/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    RabbitMQModule.forRoot({
      url: process.env['RABBITMQ_URL'] ?? 'amqp://music_admin:music_pass@localhost:5672/music',
      exchanges: [{ name: EXCHANGES.CATALOG, type: 'topic', durable: true }],
      queues: [
        {
          name: 'search-service.catalog',
          exchange: EXCHANGES.CATALOG,
          routingKey: 'events.track.#',
          deadLetterExchange: 'events.catalog.dlx',
        },
      ],
      prefetchCount: 10,
      retryAttempts: 3,
    }),
    LoggingModule,
    HealthModule,
    MetricsModule,
    ElasticsearchModule,
    MessagingModule,
    SearchModule,
  ],
})
export class AppModule {}
