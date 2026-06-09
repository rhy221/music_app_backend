import Cookies from 'js-cookie';
import { API_BASE, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN } from '@/lib/constants';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = Cookies.get(COOKIE_REFRESH_TOKEN);
  if (!refreshToken) return null;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return Cookies.get(COOKIE_ACCESS_TOKEN) ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const token = skipAuth ? null : Cookies.get(COOKIE_ACCESS_TOKEN);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Remove Content-Type for FormData (let browser set it with boundary)
  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
    } else {
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? res.statusText), { status: res.status, data: err });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type FetchOpts = RequestInit & { skipAuth?: boolean };

export function apiGet<T>(path: string, init?: FetchOpts) {
  return apiFetch<T>(path, { ...init, method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown, init?: FetchOpts) {
  return apiFetch<T>(path, {
    ...init,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T = void>(path: string, init?: FetchOpts) {
  return apiFetch<T>(path, { ...init, method: 'DELETE' });
}
