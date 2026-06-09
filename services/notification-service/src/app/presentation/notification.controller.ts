import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@org/ts-common';
import type { AuthUser } from '@org/ts-common';
import { NotificationService } from '../application/notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@UseGuards(AuthGuard)
@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notifService.list(
      user.userId,
      query.page,
      query.size,
      query.unreadOnly,
      query.type,
    );
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    const count = await this.notifService.getUnreadCount(user.userId);
    return { count };
  }

  // read-all must be declared before :id/read to avoid route shadowing
  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifService.markAllRead(user.userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notifService.markRead(id, user.userId);
  }
}
