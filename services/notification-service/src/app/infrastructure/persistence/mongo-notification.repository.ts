import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationMongo, NotificationDocument } from './notification.schema';
import { Notification } from '../../domain/notification.entity';
import { NotificationType } from '../../domain/notification-type.enum';

const TTL_DAYS: Record<NotificationType, number> = {
  [NotificationType.SYSTEM]: 7,
  [NotificationType.TRANSCODE_FAILED]: 30,
  [NotificationType.NEW_FOLLOWER]: 90,
  [NotificationType.COLLABORATOR_ADDED]: 90,
  [NotificationType.TRACK_ADDED_TO_PLAYLIST]: 90,
  [NotificationType.PLAYLIST_SHARED]: 180,
  [NotificationType.NEW_RELEASE]: 365,
};

function computeExpiry(type: NotificationType): Date {
  const days = TTL_DAYS[type] ?? 90;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function toEntity(doc: NotificationDocument): Notification {
  return {
    id: (doc._id as Types.ObjectId).toHexString(),
    userId: doc.userId,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    read: doc.read,
    data: doc.data,
    createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    expiresAt: doc.expiresAt,
  };
}

@Injectable()
export class MongoNotificationRepository {
  constructor(
    @InjectModel(NotificationMongo.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async save(partial: Omit<Notification, 'id' | 'expiresAt'>): Promise<Notification> {
    const doc = await this.model.create({
      ...partial,
      expiresAt: computeExpiry(partial.type),
    });
    return toEntity(doc);
  }

  async findByUser(
    userId: string,
    page: number,
    size: number,
    unreadOnly: boolean,
    type?: NotificationType,
  ): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) filter['read'] = false;
    if (type) filter['type'] = type;

    const [items, total, unreadCount] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(page * size)
        .limit(size)
        .exec(),
      this.model.countDocuments(filter),
      this.model.countDocuments({ userId, read: false }),
    ]);

    return { items: items.map(toEntity), total, unreadCount };
  }

  async countUnread(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, read: false });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), userId },
      { $set: { read: true } },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model.updateMany({ userId, read: false }, { $set: { read: true } });
  }
}
