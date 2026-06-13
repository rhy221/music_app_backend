import { apiGet, apiPut, apiDelete } from './client';
import type { PaginatedResponse, TrackSummaryDto, TrackDetailDto } from './types';

interface TrackListParams {
  genre?: string;
  artistId?: string;
  userId?: string;
  albumId?: string;
  sort?: 'newest' | 'oldest' | 'popular' | 'title_asc' | 'title_desc';
  page?: number;
  size?: number;
}

export function getTracks(params: TrackListParams = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<TrackSummaryDto>>(`/tracks${q ? `?${q}` : ''}`);
}

export function getPopularTracks(params: { limit?: number; genre?: string; period?: string } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<TrackSummaryDto[]>(`/tracks/popular${q ? `?${q}` : ''}`);
}

export function getNewReleases(limit?: number) {
  return apiGet<TrackSummaryDto[]>(`/tracks/new-releases${limit ? `?limit=${limit}` : ''}`);
}

export function getTrack(trackId: string) {
  return apiGet<TrackDetailDto>(`/tracks/${trackId}`);
}

export function updateTrack(
  trackId: string,
  body: { title?: string; genre?: string; albumId?: string | null; releaseDate?: string }
) {
  return apiPut<TrackDetailDto>(`/tracks/${trackId}`, body);
}

export function deleteTrack(trackId: string) {
  return apiDelete(`/tracks/${trackId}`);
}
