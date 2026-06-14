import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { RabbitMQService } from '@org/ts-common';
import { MusicEvent, TrackPublishedEvent } from '@org/music-events';
import { NotificationService } from '../../application/notification.service';
import { CatalogHttpClient } from '../http/catalog-http.client';
import { UserHttpClient } from '../http/user-http.client';
import { NotificationType } from '../../domain/notification-type.enum';

const QUEUE = 'notification-service.catalog';

@Injectable()
export class CatalogEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(CatalogEventConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly notifService: NotificationService,
    private readonly catalogClient: CatalogHttpClient,
    private readonly userClient: UserHttpClient,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(QUEUE, (msg) => this.dispatch(msg));
    this.logger.log(`Subscribed to queue '${QUEUE}'`);
  }

  private async dispatch(msg: ConsumeMessage): Promise<void> {
    const event = JSON.parse(msg.content.toString()) as MusicEvent;
    if (event.header.eventType === 'TRACK_PUBLISHED') {
      await this.handleTrackPublished(event as TrackPublishedEvent);
    }
  }

  private async handleTrackPublished(e: TrackPublishedEvent): Promise<void> {
    const { artistId, artistName, trackId, title, artistUserId } = e.data;

    // Notify the uploader that their track is live
    if (artistUserId) {
      try {
        await this.notifService.create({
          userId: artistUserId,
          type: NotificationType.TRACK_PUBLISHED,
          title: 'Track Published',
          body: `Your track "${title}" has been published successfully!`,
          data: { trackId, trackTitle: title },
        });
      } catch (err) {
        this.logger.warn(`TRACK_PUBLISHED notification failed for user ${artistUserId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Fan out NEW_RELEASE to all followers
    try {
      const resolvedUserId = artistUserId ?? (await this.catalogClient.getArtist(artistId))?.userId;
      if (!resolvedUserId) {
        this.logger.warn(`Cannot resolve userId for artist ${artistId}, skipping NEW_RELEASE fan-out`);
        return;
      }

      const followers = await this.userClient.getFollowers(resolvedUserId);
      if (followers.length === 0) return;

      this.logger.debug(`Fanning out NEW_RELEASE to ${followers.length} followers of ${artistName}`);

      const results = await Promise.allSettled(
        followers.map((follower) =>
          this.notifService.create({
            userId: follower.id,
            type: NotificationType.NEW_RELEASE,
            title: 'New Release',
            body: `${artistName} just released a new track: "${title}"`,
            data: { artistId, artistName, trackId, trackTitle: title },
          }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        this.logger.warn(`${failed}/${followers.length} NEW_RELEASE notifications failed`);
      }
    } catch (err) {
      this.logger.warn(`NEW_RELEASE fan-out failed for artist ${artistId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
