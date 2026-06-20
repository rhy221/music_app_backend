import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import * as net from 'node:net';

@Injectable()
export class LogstashTransport implements OnModuleDestroy {
  private socket: net.Socket | null = null;
  private readonly logger = new Logger('LogstashTransport');
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const host = process.env['LOGSTASH_HOST'];
    if (host) {
      const [hostname, port] = host.split(':');
      this.connect(hostname, Number(port) || 5044);
    }
  }

  private connect(host: string, port: number): void {
    this.socket = new net.Socket();
    this.socket.connect(port, host);
    this.socket.on('error', () => {
      this.scheduleReconnect(host, port);
    });
    this.socket.on('close', () => {
      this.scheduleReconnect(host, port);
    });
  }

  private scheduleReconnect(host: string, port: number): void {
    this.socket = null;
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect(host, port);
      }, 5000);
    }
  }

  send(data: Record<string, unknown>): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(JSON.stringify(data) + '\n');
    }
  }

  onModuleDestroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.destroy();
  }
}
