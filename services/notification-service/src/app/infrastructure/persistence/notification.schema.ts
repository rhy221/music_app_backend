import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '../../domain/notification-type.enum';

export type NotificationDocument = NotificationMongo & Document;

@Schema({ collection: 'notifications', timestamps: { createdAt: true, updatedAt: false } })
export class NotificationMongo {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, type: String, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ type: Date, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationMongo);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
