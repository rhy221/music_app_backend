import { apiGet, apiPost } from './client';
import type {
  RecommendationsResponse,
  DiscoverWeeklyResponse,
  TasteProfileResponse,
  TrackRecItem,
} from './types';

export function getRecommendations(params: {
  limit?: number;
  genre?: string;
  seed?: 'mixed' | 'genre' | 'artist' | 'recent';
} = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<RecommendationsResponse>(`/recommendations${q ? `?${q}` : ''}`, { noRedirect: true });
}

export function getDiscoverWeekly() {
  return apiGet<DiscoverWeeklyResponse>('/recommendations/discover-weekly', { noRedirect: true });
}

export function getSimilarTracks(trackId: string, limit = 10) {
  return apiGet<{ sourceTrackId: string; items: TrackRecItem[]; total: number }>(
    `/recommendations/similar/${trackId}?limit=${limit}`
  );
}

export function getRadio(trackId: string, limit = 25) {
  return apiGet<{ seedTrackId: string; items: TrackRecItem[]; total: number }>(
    `/recommendations/radio/${trackId}?limit=${limit}`
  );
}

export function sendFeedback(body: {
  trackId: string;
  action: 'LIKE' | 'DISLIKE' | 'SKIP' | 'SAVE_TO_PLAYLIST';
  context?: string;
}) {
  return apiPost<{ success: true; feedbackId: string }>('/recommendations/feedback', body);
}

export function getTasteProfile() {
  return apiGet<TasteProfileResponse>('/taste-profile');
}

export function refreshTasteProfile() {
  return apiPost<{ message: string; estimatedMs: number }>('/taste-profile/refresh');
}
