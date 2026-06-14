import { apiGet, apiPost } from './client';
import type { PlaySessionDto, PaginatedResponse, PlayHistoryEntry, ListeningStats } from './types';
import { API_BASE, COOKIE_ACCESS_TOKEN } from '@/lib/constants';
import Cookies from 'js-cookie';

export function getStreamUrl(trackId: string, bitrate: 128 | 256 | 320 = 320): string {
  const token = Cookies.get(COOKIE_ACCESS_TOKEN);
  return `${API_BASE}/stream/${trackId}?bitrate=${bitrate}${token ? `&token=${token}` : ''}`;
}

export function getHlsUrl(trackId: string, bitrate: 128 | 256 | 320 = 320): string {
  return `${API_BASE}/stream/${trackId}/hls?bitrate=${bitrate}`;
}

export function startPlaySession(body: {
  trackId: string;
  bitrate?: 128 | 256 | 320;
  source?: string;
}) {
  return apiPost<PlaySessionDto>('/play-sessions', body);
}

export function sendHeartbeat(sessionId: string, positionMs: number) {
  return apiPost<PlaySessionDto>(`/play-sessions/${sessionId}/heartbeat`, { positionMs });
}

export function endPlaySession(
  sessionId: string,
  body: {
    positionMs: number;
    reason?: 'COMPLETED' | 'SKIPPED' | 'PAUSED_TIMEOUT' | 'ERROR';
  }
) {
  return apiPost<PlaySessionDto>(`/play-sessions/${sessionId}/end`, body);
}

export function getHistory(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<PlayHistoryEntry>>(`/history${q ? `?${q}` : ''}`);
}

export function getRecentlyPlayed() {
  return apiGet<{ items: PlayHistoryEntry[] }>('/history/recently-played');
}

export function getListeningStats() {
  return apiGet<ListeningStats>('/history/stats');
}
