export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_BASE = `${API_URL}/api/v1`;

export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';

export const WS_URL = `${API_URL.replace(/^http/, 'ws')}/ws`;
