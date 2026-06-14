import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { PaginatedResponse, AlbumSummaryDto, AlbumDetailDto } from './types';

export function getAlbums(params: { artistId?: string; page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<AlbumSummaryDto>>(`/albums${q ? `?${q}` : ''}`);
}

export function createAlbum(body: { title: string; releaseDate?: string; coverUrl?: string }) {
  return apiPost<AlbumSummaryDto>('/albums', body);
}

export function getAlbum(albumId: string) {
  return apiGet<AlbumDetailDto>(`/albums/${albumId}`);
}

export function updateAlbum(
  albumId: string,
  body: { title?: string; coverUrl?: string; releaseDate?: string }
) {
  return apiPut<AlbumSummaryDto>(`/albums/${albumId}`, body);
}

export function deleteAlbum(albumId: string) {
  return apiDelete(`/albums/${albumId}`);
}
