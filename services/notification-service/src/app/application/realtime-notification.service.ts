import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '../domain/notification.entity';

/**
 * Decouples NotificationService (application) from NotificationGateway (presentation).
 * The gateway registers a push callback; NotificationService calls push() without
 * importing the gateway directly, avoiding a circular module dependency.
 */
@Injectable()
export class RealtimeNotificationService {
  private readonly logger = new Logger(RealtimeNotificationService.name);
  private pushFn?: (userId: string, notification: Notification) => void;

  register(pushFn: (userId: string, notification: Notification) => void): void {
    this.pushFn = pushFn;
  }

  push(userId: string, notification: Notification): void {
    if (this.pushFn) {
      this.pushFn(userId, notification);
    } else {
      this.logger.warn('No WebSocket push function registered yet');
    }
  }
}
