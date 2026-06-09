import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleInit, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { RedisService } from '@org/ts-common';
import { NotificationService } from '../../application/notification.service';
import { RealtimeNotificationService } from '../../application/realtime-notification.service';
import { Notification } from '../../domain/notification.entity';
import { WsJwtGuard } from './ws-jwt.guard';

@Injectable()
@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly notifService: NotificationService,
    private readonly realtimeService: RealtimeNotificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.realtimeService.register((userId: string, notification: Notification) => {
      this.server.to(`user:${userId}`).emit('notification', {
        type: 'notification',
        payload: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          createdAt: notification.createdAt,
        },
      });
    });
  }

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token =
        (socket.handshake.auth as Record<string, string>)?.['token'] ??
        (socket.handshake.query as Record<string, string>)?.['token'];

      if (!token) return next(new Error('Missing token'));

      try {
        const payload = this.jwtService.verify<{ sub: string }>(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });
        (socket.data as { userId: string }).userId = payload.sub;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });
    this.logger.log('WebSocket Gateway initialized on namespace /ws');
  }

  async handleConnection(client: Socket): Promise<void> {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join(`user:${userId}`);
    await this.redis.getClient().sadd(`online:${userId}`, client.id);
    this.logger.debug(`Client ${client.id} connected for user ${userId}`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = (client.data as { userId?: string }).userId;
    if (userId) {
      await this.redis.getClient().srem(`online:${userId}`, client.id);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ack')
  async handleAck(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    const userId = (client.data as { userId: string }).userId;
    await this.notifService.markRead(data.notificationId, userId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(): { type: string } {
    return { type: 'pong' };
  }
}
