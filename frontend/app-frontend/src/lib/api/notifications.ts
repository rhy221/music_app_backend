import { apiGet, apiPost, apiPut } from './client';
import type {
  PaginatedNotificationsDto,
  NotificationType,
  PreferencesDto,
} from './types';

export function getNotifications(params: {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  size?: number;
} = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedNotificationsDto>(`/notifications${q ? `?${q}` : ''}`);
}

export function getUnreadCount() {
  return apiGet<{ count: number }>('/notifications/unread-count');
}

export function markAsRead(notificationId: string) {
  return apiPost<void>(`/notifications/${notificationId}/read`);
}

export function markAllAsRead() {
  return apiPost<void>('/notifications/read-all');
}

export function getPreferences() {
  return apiGet<PreferencesDto>('/notifications/preferences');
}

export function updatePreferences(body: Partial<PreferencesDto>) {
  return apiPut<PreferencesDto>('/notifications/preferences', body);
}
