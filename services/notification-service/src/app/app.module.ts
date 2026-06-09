import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EXCHANGES, ROUTING_KEYS } from '@org/music-events';
import { HealthModule, LoggingModule, MetricsModule, RabbitMQModule, RedisModule } from '@org/ts-common';
import configuration from './config/configuration';
import { NotificationModule } from './presentation/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    RabbitMQModule.forRoot({
      url: process.env['RABBITMQ_URL'] ?? 'amqp://music_admin:music_pass@localhost:5672/music',
      exchanges: [
        { name: EXCHANGES.USER,     type: 'topic', durable: true },
        { name: EXCHANGES.PLAYLIST, type: 'topic', durable: true },
        { name: EXCHANGES.UPLOAD,   type: 'topic', durable: true },
        { name: EXCHANGES.CATALOG,  type: 'topic', durable: true },
      ],
      queues: [
        {
          name: 'notification-service.user',
          exchange: EXCHANGES.USER,
          routingKey: 'events.user.#',
          deadLetterExchange: 'events.user.dlx',
        },
        {
          name: 'notification-service.playlist',
          exchange: EXCHANGES.PLAYLIST,
          routingKey: 'events.playlist.#',
          deadLetterExchange: 'events.playlist.dlx',
        },
        {
          name: 'notification-service.upload',
          exchange: EXCHANGES.UPLOAD,
          routingKey: ROUTING_KEYS.TRANSCODE_FAILED,
          deadLetterExchange: 'events.upload.dlx',
        },
        {
          name: 'notification-service.catalog',
          exchange: EXCHANGES.CATALOG,
          routingKey: ROUTING_KEYS.TRACK_PUBLISHED,
          deadLetterExchange: 'events.catalog.dlx',
        },
      ],
      prefetchCount: 10,
      retryAttempts: 3,
    }),
    RedisModule.forRoot({
      url: process.env['REDIS_URL'] ?? 'redis://:music_pass@localhost:6379',
      keyPrefix: 'notification:',
    }),
    LoggingModule,
    HealthModule,
    MetricsModule,
    NotificationModule,
  ],
})
export class AppModule {}
