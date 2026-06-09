import { NotificationType } from './notification-type.enum';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}
