import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@org/ts-common';
import type { AuthUser } from '@org/ts-common';
import { PreferenceService } from '../application/preference.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@UseGuards(AuthGuard)
@Controller('v1/notifications/preferences')
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.preferenceService.get(user.userId);
  }

  @Put()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferencesDto) {
    return this.preferenceService.update(user.userId, dto);
  }
}
