import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NotificationMongo, NotificationSchema } from './notification.schema';
import {
  NotificationPreferenceMongo,
  NotificationPreferenceSchema,
} from './notification-preference.schema';
import { MongoNotificationRepository } from './mongo-notification.repository';
import { MongoPreferenceRepository } from './mongo-preference.repository';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri')!,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: NotificationMongo.name, schema: NotificationSchema },
      { name: NotificationPreferenceMongo.name, schema: NotificationPreferenceSchema },
    ]),
  ],
  providers: [MongoNotificationRepository, MongoPreferenceRepository],
  exports: [MongoNotificationRepository, MongoPreferenceRepository],
})
export class PersistenceModule {}
