import { Injectable } from '@nestjs/common';
import { MongoPreferenceRepository } from '../infrastructure/persistence/mongo-preference.repository';
import { NotificationPreference } from '../domain/notification-preference.entity';

@Injectable()
export class PreferenceService {
  constructor(private readonly repo: MongoPreferenceRepository) {}

  get(userId: string): Promise<NotificationPreference> {
    return this.repo.findOrCreate(userId);
  }

  update(
    userId: string,
    partial: Partial<Omit<NotificationPreference, 'userId'>>,
  ): Promise<NotificationPreference> {
    return this.repo.upsert(userId, partial);
  }
}
