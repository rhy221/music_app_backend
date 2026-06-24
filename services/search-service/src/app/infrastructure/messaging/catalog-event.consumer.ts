import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { RabbitMQService } from '@org/ts-common';
import {
  MusicEvent,
  TrackPublishedEvent,
  TrackUpdatedEvent,
  TrackDeletedEvent,
} from '@org/music-events';
import { TrackEsRepository } from '../elasticsearch/track-es.repository';
import { ArtistEsRepository } from '../elasticsearch/artist-es.repository';
import { AlbumEsRepository } from '../elasticsearch/album-es.repository';
import { TrackDocument } from '../../domain/track.document';
import { ArtistDocument } from '../../domain/artist.document';

const QUEUE = 'search-service.catalog';

@Injectable()
export class CatalogEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(CatalogEventConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly trackRepo: TrackEsRepository,
    private readonly artistRepo: ArtistEsRepository,
    private readonly albumRepo: AlbumEsRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe(QUEUE, (msg) => this.dispatch(msg));
    this.logger.log(`Subscribed to queue '${QUEUE}'`);
  }

  private async dispatch(msg: ConsumeMessage): Promise<void> {
    const event = JSON.parse(msg.content.toString()) as MusicEvent;
    const type = event.header.eventType;

    switch (type) {
      case 'TRACK_PUBLISHED':
        await this.handleTrackPublished(event as TrackPublishedEvent);
        break;
      case 'TRACK_UPDATED':
        await this.handleTrackUpdated(event as TrackUpdatedEvent);
        break;
      case 'TRACK_DELETED':
        await this.handleTrackDeleted(event as TrackDeletedEvent);
        break;
      default:
        this.logger.debug(`Ignoring event type '${type}' on queue ${QUEUE}`);
    }
  }

  private async handleTrackPublished(event: TrackPublishedEvent): Promise<void> {
    const { trackId, title, durationMs, coverUrl, genre, artistId, artistName, albumId, albumTitle } = event.data;

    const doc: TrackDocument = {
      id: trackId,
      title,
      genre,
      durationMs,
      coverUrl,
      playCount: 0,
      status: 'PUBLISHED',
      createdAt: event.header.timestamp,
      artist: { id: artistId, name: artistName },
      ...(albumId && albumTitle ? { album: { id: albumId, title: albumTitle } } : {}),
    };

    await this.trackRepo.upsert(doc);

    const artistDoc: ArtistDocument = {
      id: artistId,
      name: artistName,
      trackCount: 0,
      genreTags: genre ? [genre] : [],
    };
    await this.artistRepo.upsert(artistDoc);
    await this.artistRepo.incrTrackCount(artistId, artistName, genre);

    if (albumId && albumTitle) {
      await this.albumRepo.incrTrackCount(
        albumId,
        albumTitle,
        { id: artistId, name: artistName },
        coverUrl,
      );
    }

    this.logger.debug(`Indexed track ${trackId} and upserted artist ${artistId}`);
  }

  private async handleTrackUpdated(event: TrackUpdatedEvent): Promise<void> {
    const { trackId, title, genre, coverUrl, artistName } = event.data;
    await this.trackRepo.partialUpdate(trackId, {
      title,
      genre,
      coverUrl,
      artist: { id: '', name: artistName },
    });
    this.logger.debug(`Updated track ${trackId}`);
  }

  private async handleTrackDeleted(event: TrackDeletedEvent): Promise<void> {
    await this.trackRepo.delete(event.data.trackId);
    this.logger.debug(`Deleted track ${event.data.trackId}`);
  }
}
