import { Injectable } from '@nestjs/common';

const MOCK_NOTIFICATIONS = [
  {
    notificationId: 'notif-001',
    type: 'NEW_FOLLOWER',
    message: 'Deep Blue started following you',
    read: false,
    createdAt: '2024-06-01T09:00:00Z',
    metadata: { userId: 'artist-002', displayName: 'Deep Blue' },
  },
  {
    notificationId: 'notif-002',
    type: 'TRACK_PUBLISHED',
    message: 'Your track "Starlight Serenade" is now live',
    read: true,
    createdAt: '2024-05-30T14:00:00Z',
    metadata: { trackId: 'track-001', title: 'Starlight Serenade' },
  },
  {
    notificationId: 'notif-003',
    type: 'PLAYLIST_SHARED',
    message: 'Luna Echo shared a playlist with you',
    read: false,
    createdAt: '2024-05-29T18:30:00Z',
    metadata: { playlistId: 'playlist-001', title: 'Evening Vibes' },
  },
];

@Injectable()
export class AppService {
  getNotifications(page = 0, size = 20, unreadOnly = false) {
    const items = unreadOnly
      ? MOCK_NOTIFICATIONS.filter((n) => !n.read)
      : MOCK_NOTIFICATIONS;
    return {
      items,
      total: items.length,
      unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
      page,
      size,
    };
  }

  getUnreadCount() {
    const count = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
    return { count };
  }

  markAsRead(notificationId: string) {
    const notification = MOCK_NOTIFICATIONS.find((n) => n.notificationId === notificationId);
    if (notification) notification.read = true;
    return { success: true, notificationId };
  }

  markAllAsRead() {
    MOCK_NOTIFICATIONS.forEach((n) => (n.read = true));
    return { success: true, updatedCount: MOCK_NOTIFICATIONS.length };
  }
}
