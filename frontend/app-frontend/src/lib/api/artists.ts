import { apiGet, apiPut } from './client';
import type { PaginatedResponse, ArtistSummaryDto, ArtistDetailDto } from './types';

export function getArtists(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<ArtistSummaryDto>>(`/artists${q ? `?${q}` : ''}`);
}

export function getArtist(artistId: string) {
  return apiGet<ArtistDetailDto>(`/artists/${artistId}`);
}

export function updateArtist(
  artistId: string,
  body: { name?: string; bio?: string; avatarUrl?: string }
) {
  return apiPut<ArtistSummaryDto>(`/artists/${artistId}`, body);
}
