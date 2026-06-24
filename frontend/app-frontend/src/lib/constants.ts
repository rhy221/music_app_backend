export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
export const API_BASE = `${API_URL}/api/v1`;

export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';

// Notification service URL — Socket.IO connects directly (bypasses gateway)
// because Socket.IO's transport protocol is complex to proxy via KrakenD.
export const NOTIFICATION_URL = process.env.NEXT_PUBLIC_NOTIFICATION_URL ?? 'http://localhost:8087';

export const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? '/storage';
// export const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? 'http://localhost:9000';

/** Convert a MinIO object key (e.g. "artworks/xxx/cover.png") to a public HTTP URL. */
export function storageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const bucket = key.startsWith('artworks/') ? 'images' : 'audio';
  return `${MINIO_URL}/${bucket}/${key}`;
}
