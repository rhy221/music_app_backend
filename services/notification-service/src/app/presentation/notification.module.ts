import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingModule } from '../infrastructure/messaging/messaging.module';
import { NotificationController } from './notification.controller';
import { PreferenceController } from './preference.controller';
import { NotificationGateway } from './websocket/notification.gateway';
import { WsJwtGuard } from './websocket/ws-jwt.guard';

@Module({
  imports: [
    MessagingModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController, PreferenceController],
  providers: [NotificationGateway, WsJwtGuard],
})
export class NotificationModule {}
