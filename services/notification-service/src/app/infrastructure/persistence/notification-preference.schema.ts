import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationPreferenceDocument = NotificationPreferenceMongo & Document;

@Schema({ collection: 'notification_preferences' })
export class NotificationPreferenceMongo {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  pushEnabled: boolean;

  @Prop({ default: true })
  newFollower: boolean;

  @Prop({ default: true })
  playlistShared: boolean;

  @Prop({ default: true })
  newRelease: boolean;

  @Prop({ default: true })
  collaboratorActivity: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreferenceMongo);
