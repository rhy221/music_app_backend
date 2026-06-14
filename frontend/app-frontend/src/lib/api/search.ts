import { apiGet } from './client';
import type { SearchAlbumHit, SearchArtistHit, SearchTrackHit, AutocompleteSuggestion } from './types';

interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  queryTimeMs: number;
}

export function search(params: {
  q: string;
  type?: ('track' | 'artist')[];
  genre?: string;
  page?: number;
  size?: number;
}) {
  const q = new URLSearchParams();
  q.set('q', params.q);
  if (params.type?.length) params.type.forEach((t) => q.append('type', t));
  if (params.genre) q.set('genre', params.genre);
  if (params.page != null) q.set('page', String(params.page));
  if (params.size != null) q.set('size', String(params.size));
  return apiGet<{
    tracks: { items: SearchTrackHit[]; total: number };
    artists: { items: SearchArtistHit[]; total: number };
    albums: { items: SearchAlbumHit[]; total: number };
    totalResults: number;
    queryTimeMs: number;
  }>(`/search?${q.toString()}`, { skipAuth: true });
}

export function searchTracks(params: {
  q: string;
  genre?: string;
  artistId?: string;
  sort?: 'relevance' | 'newest' | 'popular' | 'title';
  page?: number;
  size?: number;
}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PagedResponse<SearchTrackHit>>(`/search/tracks?${q}`);
}

export function searchArtists(params: { q: string; page?: number; size?: number }) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PagedResponse<SearchArtistHit>>(`/search/artists?${q}`);
}

export function searchAlbums(params: { q: string; page?: number; size?: number }) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PagedResponse<SearchAlbumHit>>(`/search/albums?${q}`);
}

export function autocomplete(q: string, limit = 5) {
  return apiGet<{ suggestions: AutocompleteSuggestion[] }>(
    `/search/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}`
  );
}
