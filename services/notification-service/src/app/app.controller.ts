import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('v1/notifications')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getNotifications(
    @Query('page') page = 0,
    @Query('size') size = 20,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.appService.getNotifications(+page, +size, unreadOnly === 'true');
  }

  @Get('unread-count')
  getUnreadCount() {
    return this.appService.getUnreadCount();
  }

  @Post(':notificationId/read')
  markAsRead(@Param('notificationId') notificationId: string) {
    return this.appService.markAsRead(notificationId);
  }

  @Post('read-all')
  markAllAsRead() {
    return this.appService.markAllAsRead();
  }
}
