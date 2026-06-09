import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { RabbitMQService } from '@org/ts-common';
import { MusicEvent, TranscodeFailedEvent } from '@org/music-events';
import { NotificationService } from '../../application/notification.service';
import { NotificationType } from '../../domain/notification-type.enum';

const QUEUE = 'notification-service.upload';

@Injectable()
export class UploadEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(UploadEventConsumer.name);

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
    if (event.header.eventType === 'TRANSCODE_FAILED') {
      await this.handleTranscodeFailed(event as TranscodeFailedEvent);
    }
  }

  private async handleTranscodeFailed(e: TranscodeFailedEvent): Promise<void> {
    const { uploaderId, errorMessage, uploadJobId } = e.data;
    await this.notifService.create({
      userId: uploaderId,
      type: NotificationType.TRANSCODE_FAILED,
      title: 'Upload Failed',
      body: `Your upload failed to process: ${errorMessage}`,
      data: { uploadJobId, errorMessage },
    });
  }
}
