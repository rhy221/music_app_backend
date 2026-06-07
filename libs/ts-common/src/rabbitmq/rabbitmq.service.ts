import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Channel, ConsumeMessage, Connection } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

/**
 * Provides publish/subscribe operations over an AMQP channel.
 */
@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private channel: Channel;
  private connection: Connection;
  private maxRetries = 3;

  /** @internal Called by RabbitMQModule after the connection is established. */
  setChannel(channel: Channel, connection: Connection, maxRetries: number): void {
    this.channel = channel;
    this.connection = connection;
    this.maxRetries = maxRetries;
  }

  /**
   * Publishes a JSON-serialised event to an exchange.
   * @param correlationId Optional ID for distributed tracing.
   */
  async publish(
    exchange: string,
    routingKey: string,
    event: unknown,
    correlationId?: string,
  ): Promise<void> {
    const content = Buffer.from(JSON.stringify(event));
    this.channel.publish(exchange, routingKey, content, {
      contentType: 'application/json',
      persistent: true,
      messageId: uuidv4(),
      timestamp: Math.floor(Date.now() / 1000),
      correlationId,
    });
  }

  /**
   * Subscribes to a queue; auto-acks on success, nacks with retry tracking on failure.
   */
  async subscribe(
    queue: string,
    handler: (msg: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await handler(msg);
        this.channel.ack(msg);
      } catch (err) {
        const retries = (msg.properties.headers?.['x-retry-count'] ?? 0) as number;
        if (retries >= this.maxRetries) {
          this.logger.warn(`Max retries reached for queue ${queue}, rejecting message`);
          this.channel.reject(msg, false);
        } else {
          this.channel.nack(msg, false, true);
        }
      }
    });
  }

  /** Exposes the raw AMQP channel for advanced use cases (pub/sub, confirms, etc.). */
  getChannel(): Channel {
    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // already closed
    }
  }
}
