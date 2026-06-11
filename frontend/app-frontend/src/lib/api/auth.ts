import { apiFetch } from './client';
import type { AuthResponse, UserProfileDto } from './types';

export function register(body: { email: string; password: string; displayName: string }) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function login(body: { email: string; password: string }) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

export function googleAuth(idToken: string) {
  return apiFetch<AuthResponse>('/auth/oauth2/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
    skipAuth: true,
  });
}

export function getMe() {
  return apiFetch<UserProfileDto>('/users/me', { noRedirect: true });
}

export function updateMe(body: { displayName?: string; bio?: string }) {
  return apiFetch<UserProfileDto>('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
}

export function updateAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ avatarUrl: string }>('/users/me/avatar', { method: 'PUT', body: form });
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return apiFetch<void>('/users/me/password', { method: 'PUT', body: JSON.stringify(body) });
}
