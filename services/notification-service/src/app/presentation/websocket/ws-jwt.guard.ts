import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token =
      (client.handshake.auth as Record<string, string>)?.['token'] ??
      (client.handshake.query as Record<string, string>)?.['token'];

    if (!token) throw new WsException('Missing JWT token');

    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
      (client.data as { userId: string }).userId = payload.sub;
      return true;
    } catch (err) {
      this.logger.warn(`WS auth failed: ${String(err)}`);
      throw new WsException('Invalid or expired JWT');
    }
  }
}
