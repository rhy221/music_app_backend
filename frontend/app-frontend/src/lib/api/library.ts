import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { PaginatedResponse, SavedAlbumDto, FollowedPlaylistDto, SavedTrackDto } from './types';

function buildQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return q ? `?${q}` : '';
}

// ── Albums ────────────────────────────────────────────────────────────────────

export function saveAlbum(albumId: string) {
  return apiPost<SavedAlbumDto>('/library/albums', { albumId });
}

export function unsaveAlbum(albumId: string) {
  return apiDelete(`/library/albums/${albumId}`);
}

export function getSavedAlbums(params: { page?: number; size?: number } = {}) {
  return apiGet<PaginatedResponse<SavedAlbumDto>>(`/library/albums${buildQuery(params)}`);
}

export function isAlbumSaved(albumId: string) {
  return apiGet<{ saved: boolean }>(`/library/albums/${albumId}/saved`);
}

// ── Playlists ─────────────────────────────────────────────────────────────────

export function followPlaylist(playlistId: string) {
  return apiPost<FollowedPlaylistDto>('/library/playlists', { playlistId });
}

export function unfollowPlaylist(playlistId: string) {
  return apiDelete(`/library/playlists/${playlistId}`);
}

export function getFollowedPlaylists(params: { page?: number; size?: number } = {}) {
  return apiGet<PaginatedResponse<FollowedPlaylistDto>>(`/library/playlists${buildQuery(params)}`);
}

export function isPlaylistFollowed(playlistId: string) {
  return apiGet<{ followed: boolean }>(`/library/playlists/${playlistId}/followed`);
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export function saveTrack(trackId: string) {
  return apiPost<SavedTrackDto>('/library/tracks', { trackId });
}

export function unsaveTrack(trackId: string) {
  return apiDelete(`/library/tracks/${trackId}`);
}

export function getSavedTracks(params: { page?: number; size?: number } = {}) {
  return apiGet<PaginatedResponse<SavedTrackDto>>(`/library/tracks${buildQuery(params)}`);
}

export function isTrackSaved(trackId: string) {
  return apiGet<{ saved: boolean }>(`/library/tracks/${trackId}/saved`);
}

export function reorderSavedTracks(trackIds: string[]) {
  return apiPut<void>('/library/tracks/reorder', { trackIds });
}
