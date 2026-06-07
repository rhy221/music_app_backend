export interface ExchangeConfig {
  name: string;
  type: 'topic' | 'direct' | 'fanout';
  durable?: boolean;
}

export interface QueueConfig {
  name: string;
  exchange: string;
  routingKey: string;
  deadLetterExchange?: string;
}

export interface RabbitMQModuleOptions {
  url: string;
  exchanges?: ExchangeConfig[];
  queues?: QueueConfig[];
  prefetchCount?: number;
  retryAttempts?: number;
  retryDelay?: number;
}
