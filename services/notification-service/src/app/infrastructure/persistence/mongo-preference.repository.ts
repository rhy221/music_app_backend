import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NotificationPreferenceMongo,
  NotificationPreferenceDocument,
} from './notification-preference.schema';
import { NotificationPreference } from '../../domain/notification-preference.entity';

const DEFAULTS: Omit<NotificationPreference, 'userId'> = {
  emailEnabled: true,
  pushEnabled: true,
  newFollower: true,
  playlistShared: true,
  newRelease: true,
  collaboratorActivity: true,
};

@Injectable()
export class MongoPreferenceRepository {
  constructor(
    @InjectModel(NotificationPreferenceMongo.name)
    private readonly model: Model<NotificationPreferenceDocument>,
  ) {}

  async findOrCreate(userId: string): Promise<NotificationPreference> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, ...DEFAULTS } },
      { upsert: true, new: true },
    );
    return this.toEntity(doc!);
  }

  async upsert(
    userId: string,
    prefs: Partial<Omit<NotificationPreference, 'userId'>>,
  ): Promise<NotificationPreference> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $set: prefs },
      { upsert: true, new: true },
    );
    return this.toEntity(doc!);
  }

  private toEntity(doc: NotificationPreferenceDocument): NotificationPreference {
    return {
      userId: doc.userId,
      emailEnabled: doc.emailEnabled,
      pushEnabled: doc.pushEnabled,
      newFollower: doc.newFollower,
      playlistShared: doc.playlistShared,
      newRelease: doc.newRelease,
      collaboratorActivity: doc.collaboratorActivity,
    };
  }
}
