import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
import type {
  PaginatedResponse,
  PlaylistSummaryDto,
  PlaylistDetailDto,
  PlaylistItemDto,
  CollaboratorDto,
} from './types';

export function getMyPlaylists(params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<PlaylistSummaryDto>>(`/playlists${q ? `?${q}` : ''}`);
}

export function getUserPlaylists(userId: string, params: { page?: number; size?: number } = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiGet<PaginatedResponse<PlaylistSummaryDto>>(`/users/${userId}/playlists${q ? `?${q}` : ''}`);
}

export function createPlaylist(body: {
  name: string;
  description?: string;
  visibility?: 'PRIVATE' | 'PUBLIC' | 'UNLISTED';
}) {
  return apiPost<PlaylistDetailDto>('/playlists', body);
}

export function getPlaylist(playlistId: string) {
  return apiGet<PlaylistDetailDto>(`/playlists/${playlistId}`);
}

export function updatePlaylist(
  playlistId: string,
  body: { name?: string; description?: string; visibility?: 'PRIVATE' | 'PUBLIC' | 'UNLISTED' }
) {
  return apiPatch<PlaylistDetailDto>(`/playlists/${playlistId}`, body);
}

export function deletePlaylist(playlistId: string) {
  return apiDelete(`/playlists/${playlistId}`);
}

export function addTrackToPlaylist(
  playlistId: string,
  body: { trackId: string; position?: number }
) {
  return apiPost<PlaylistItemDto>(`/playlists/${playlistId}/items`, body);
}

export function removeTrackFromPlaylist(playlistId: string, itemId: string) {
  return apiDelete(`/playlists/${playlistId}/items/${itemId}`);
}

export function reorderPlaylistItems(playlistId: string, itemIds: string[]) {
  return apiPut<void>(`/playlists/${playlistId}/items/reorder`, { itemIds });
}

export function getCollaborators(playlistId: string) {
  return apiGet<CollaboratorDto[]>(`/playlists/${playlistId}/collaborators`);
}

export function addCollaborator(
  playlistId: string,
  body: { userId: string; role: 'EDITOR' | 'VIEWER' }
) {
  return apiPost<CollaboratorDto>(`/playlists/${playlistId}/collaborators`, body);
}

export function removeCollaborator(playlistId: string, userId: string) {
  return apiDelete(`/playlists/${playlistId}/collaborators/${userId}`);
}
