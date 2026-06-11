'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Cookies from 'js-cookie';
import { COOKIE_ACCESS_TOKEN } from '@/lib/constants';
import { toast } from 'sonner';

function saveAccessToken(accessToken: string, expiresIn?: number) {
  Cookies.set(COOKIE_ACCESS_TOKEN, accessToken, {
    expires: expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date(Date.now() + 15 * 60 * 1000),
    path: '/',
    sameSite: 'lax',
  });
}

export function useAuth() {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();
  const router = useRouter();

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? err.error ?? 'Login failed');
    }
    const data = await res.json();
    // console.log('Login successful:', data.accessToken);
    saveAccessToken(data.accessToken, data.expiresIn);
    setUser(data.user);
    router.push('/');
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? err.error ?? 'Registration failed');
    }
    const data = await res.json();
    saveAccessToken(data.accessToken, data.expiresIn);
    setUser(data.user);
    router.push('/');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    Cookies.remove(COOKIE_ACCESS_TOKEN, { path: '/' });
    clearUser();
    router.push('/login');
    toast.success('Logged out');
  }

  return { user, isAuthenticated, login, register, logout };
}
