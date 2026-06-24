import {
  DynamicModule,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import { RABBITMQ_MODULE_OPTIONS } from './rabbitmq.constants';
import type { RabbitMQModuleOptions } from './rabbitmq.interfaces';
import { RabbitMQService } from './rabbitmq.service';

/**
 * NestJS dynamic module for RabbitMQ (AMQP) connectivity.
 *
 * @example
 * RabbitMQModule.forRoot({
 *   url: process.env.RABBIT_URL,
 *   exchanges: [{ name: 'events.user', type: 'topic' }],
 *   queues: [{ name: 'notification.all', exchange: 'events.user', routingKey: 'user.#' }],
 * })
 */
@Module({})
export class RabbitMQModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQModule.name);
  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  constructor(
    private readonly options: RabbitMQModuleOptions,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  static forRoot(options: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        { provide: RABBITMQ_MODULE_OPTIONS, useValue: options },
        {
          provide: RabbitMQModule,
          useFactory: (svc: RabbitMQService) => new RabbitMQModule(options, svc),
          inject: [RabbitMQService],
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
      global: true,
    };
  }

  async onModuleInit(): Promise<void> {
    const {
      url,
      exchanges = [],
      queues = [],
      prefetchCount = 10,
      retryAttempts = 3,
    } = this.options;

    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(prefetchCount);

    for (const ex of exchanges) {
      await this.channel.assertExchange(ex.name, ex.type, {
        durable: ex.durable ?? true,
      });
    }

    for (const q of queues) {
      const args: Record<string, string> = {};
      if (q.deadLetterExchange) {
        args['x-dead-letter-exchange'] = q.deadLetterExchange;
      }
      await this.channel.assertQueue(q.name, { durable: true, arguments: args });
      await this.channel.bindQueue(q.name, q.exchange, q.routingKey);
    }

    this.rabbitMQService.setChannel(this.channel, this.connection, retryAttempts);
    this.logger.log('RabbitMQ connection established');
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('RabbitMQ connection closed');
    } catch {
      // already closed
    }
  }
}
