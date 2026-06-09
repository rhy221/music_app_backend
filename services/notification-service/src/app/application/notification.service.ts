import { Injectable } from '@nestjs/common';
import { MongoNotificationRepository } from '../infrastructure/persistence/mongo-notification.repository';
import { UnreadCountCacheService } from '../infrastructure/cache/unread-count-cache.service';
import { EmailService } from '../infrastructure/email/email.service';
import { RealtimeNotificationService } from './realtime-notification.service';
import { NotificationType } from '../domain/notification-type.enum';
import { Notification } from '../domain/notification.entity';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  recipientEmail?: string;
  emailEnabled?: boolean;
}

export interface NotificationListResult {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  unreadCount: number;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly notifRepo: MongoNotificationRepository,
    private readonly cache: UnreadCountCacheService,
    private readonly emailService: EmailService,
    private readonly realtime: RealtimeNotificationService,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const saved = await this.notifRepo.save({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      read: false,
      data: input.data,
      createdAt: new Date(),
    });

    await this.cache.invalidate(input.userId);
    this.realtime.push(input.userId, saved);

    if (input.emailEnabled && input.recipientEmail && this.emailService.isEmailWorthy(input.type)) {
      void this.emailService.sendNotificationEmail(input.recipientEmail, input.title, input.body);
    }

    return saved;
  }

  async list(
    userId: string,
    page: number,
    size: number,
    unreadOnly: boolean,
    type?: NotificationType,
  ): Promise<NotificationListResult> {
    const { items, total, unreadCount } = await this.notifRepo.findByUser(
      userId,
      page,
      size,
      unreadOnly,
      type,
    );
    return {
      content: items,
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cached = await this.cache.get(userId);
    if (cached !== null) return cached;

    const count = await this.notifRepo.countUnread(userId);
    await this.cache.set(userId, count);
    return count;
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.markRead(id, userId);
    await this.cache.invalidate(userId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.markAllRead(userId);
    await this.cache.set(userId, 0);
  }
}
