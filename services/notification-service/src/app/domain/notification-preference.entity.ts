export interface NotificationPreference {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  newFollower: boolean;
  playlistShared: boolean;
  newRelease: boolean;
  collaboratorActivity: boolean;
}
