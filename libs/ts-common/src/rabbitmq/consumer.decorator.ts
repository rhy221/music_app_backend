import { SetMetadata } from '@nestjs/common';
import { RABBITMQ_CONSUMER_METADATA } from './rabbitmq.constants';

/**
 * Marks a method as a RabbitMQ consumer for the given queue.
 *
 * @example
 * \@Injectable()
 * export class TrackConsumer {
 *   \@RabbitConsumer('search.track-sync')
 *   async handle(event: TrackPublishedEvent) { ... }
 * }
 */
export const RabbitConsumer = (queue: string): MethodDecorator =>
  SetMetadata(RABBITMQ_CONSUMER_METADATA, queue);
