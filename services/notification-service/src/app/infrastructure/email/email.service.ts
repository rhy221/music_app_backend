import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '../../domain/notification-type.enum';

const EMAIL_WORTHY_TYPES = new Set<NotificationType>([
  NotificationType.NEW_FOLLOWER,
  NotificationType.PLAYLIST_SHARED,
  NotificationType.NEW_RELEASE,
  NotificationType.TRANSCODE_FAILED,
]);

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('smtp.from')!;
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('smtp.host'),
      port: this.config.get<number>('smtp.port'),
      auth: {
        user: this.config.get<string>('smtp.user'),
        pass: this.config.get<string>('smtp.pass'),
      },
    });
  }

  isEmailWorthy(type: NotificationType): boolean {
    return EMAIL_WORTHY_TYPES.has(type);
  }

  async sendNotificationEmail(toEmail: string, title: string, body: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: toEmail,
        subject: title,
        text: body,
        html: `<p>${body}</p>`,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${toEmail}: ${String(err)}`);
    }
  }
}
