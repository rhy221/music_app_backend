import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { RabbitMQService } from '@org/ts-common';
import {
  CollaboratorAddedEvent,
  MusicEvent,
  PlaylistSharedEvent,
  PlaylistTrackAddedEvent,
} from '@org/music-events';
import { NotificationService } from '../../application/notification.service';
import { NotificationType } from '../../domain/notification-type.enum';

const QUEUE = 'notification-service.playlist';

@Injectable()
export class PlaylistEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(PlaylistEventConsumer.name);

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
    switch (event.header.eventType) {
      case 'PLAYLIST_SHARED':
        await this.handleShared(event as PlaylistSharedEvent);
        break;
      case 'COLLABORATOR_ADDED':
        await this.handleCollaboratorAdded(event as CollaboratorAddedEvent);
        break;
      case 'PLAYLIST_TRACK_ADDED':
        await this.handleTrackAdded(event as PlaylistTrackAddedEvent);
        break;
      default:
        this.logger.debug(`Ignoring ${event.header.eventType} on ${QUEUE}`);
    }
  }

  private async handleShared(e: PlaylistSharedEvent): Promise<void> {
    const { playlistId, playlistName, ownerName, sharedWithUserId } = e.data;
    await this.notifService.create({
      userId: sharedWithUserId,
      type: NotificationType.PLAYLIST_SHARED,
      title: 'Playlist Shared',
      body: `${ownerName} shared "${playlistName}" with you`,
      data: { playlistId, playlistName },
    });
  }

  private async handleCollaboratorAdded(e: CollaboratorAddedEvent): Promise<void> {
    const { playlistId, playlistName, collaboratorId, ownerId } = e.data;
    await this.notifService.create({
      userId: collaboratorId,
      type: NotificationType.COLLABORATOR_ADDED,
      title: 'Added as Collaborator',
      body: `You have been added as a collaborator on "${playlistName}"`,
      data: { playlistId, ownerId },
    });
  }

  private async handleTrackAdded(e: PlaylistTrackAddedEvent): Promise<void> {
    const { playlistId, playlistName, trackTitle, addedByName, collaboratorIds } = e.data;
    await Promise.all(
      collaboratorIds.map((uid) =>
        this.notifService.create({
          userId: uid,
          type: NotificationType.TRACK_ADDED_TO_PLAYLIST,
          title: 'Track Added to Playlist',
          body: `${addedByName} added "${trackTitle}" to "${playlistName}"`,
          data: { playlistId, trackTitle },
        }),
      ),
    );
  }
}
