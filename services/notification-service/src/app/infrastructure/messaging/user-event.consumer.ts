import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { RabbitMQService } from '@org/ts-common';
import { MusicEvent, UserFollowedEvent } from '@org/music-events';
import { NotificationService } from '../../application/notification.service';
import { NotificationType } from '../../domain/notification-type.enum';

const QUEUE = 'notification-service.user';

@Injectable()
export class UserEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(UserEventConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notifService: NotificationService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(QUEUE, (msg) => this.dispatch(msg));
    this.logger.log(`Subscribed to queue '${QUEUE}'`);
  }

  private async dispatch(msg: ConsumeMessage): Promise<void> {
    const event = JSON.parse(msg.content.toString()) as MusicEvent;
    if (event.header.eventType === 'USER_FOLLOWED') {
      await this.handleUserFollowed(event as UserFollowedEvent);
    }
  }

  private async handleUserFollowed(event: UserFollowedEvent): Promise<void> {
    const { followerId, followerName, followingId } = event.data;
    await this.notifService.create({
      userId: followingId,
      type: NotificationType.NEW_FOLLOWER,
      title: 'New Follower',
      body: `${followerName} started following you`,
      data: { followerId, followerName },
    });
  }
}
