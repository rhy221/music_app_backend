import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsBoolean() newFollower?: boolean;
  @IsOptional() @IsBoolean() playlistShared?: boolean;
  @IsOptional() @IsBoolean() newRelease?: boolean;
  @IsOptional() @IsBoolean() collaboratorActivity?: boolean;
}
