import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { HttpClientModule } from '../http/http.module';
import { EmailModule } from '../email/email.module';
import { UnreadCountCacheService } from '../cache/unread-count-cache.service';
import { NotificationService } from '../../application/notification.service';
import { PreferenceService } from '../../application/preference.service';
import { RealtimeNotificationService } from '../../application/realtime-notification.service';
import { UserEventConsumer } from './user-event.consumer';
import { PlaylistEventConsumer } from './playlist-event.consumer';
import { UploadEventConsumer } from './upload-event.consumer';
import { CatalogEventConsumer } from './catalog-event.consumer';

@Module({
  imports: [PersistenceModule, HttpClientModule, EmailModule],
  providers: [
    UnreadCountCacheService,
    RealtimeNotificationService,
    NotificationService,
    PreferenceService,
    UserEventConsumer,
    PlaylistEventConsumer,
    UploadEventConsumer,
    CatalogEventConsumer,
  ],
  exports: [NotificationService, PreferenceService, RealtimeNotificationService, UnreadCountCacheService],
})
export class MessagingModule {}
