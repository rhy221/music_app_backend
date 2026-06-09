import { apiGet, apiPost, apiDelete, apiPut } from './client';
import type { PaginatedResponse, PublicUserProfileDto, UserProfileDto } from './types';

export function getUser(userId: string) {
  return apiGet<PublicUserProfileDto>(`/users/${userId}`);
}

export function followUser(userId: string) {
  return apiPost<void>(`/users/${userId}/follow`);
}

export function unfollowUser(userId: string) {
  return apiDelete(`/users/${userId}/follow`);
}

export function getFollowers(userId: string, params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<UserProfileDto>>(`/users/${userId}/followers${q ? `?${q}` : ''}`);
}

export function getFollowing(userId: string, params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<UserProfileDto>>(`/users/${userId}/following${q ? `?${q}` : ''}`);
}

export function getAdminUsers(params: {
  role?: 'USER' | 'ADMIN';
  search?: string;
  page?: number;
  size?: number;
} = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<UserProfileDto>>(`/admin/users${q ? `?${q}` : ''}`);
}

export function updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
  return apiPut<UserProfileDto>(`/admin/users/${userId}/role`, { role });
}
