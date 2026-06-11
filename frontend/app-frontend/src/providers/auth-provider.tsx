'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMe } from '@/lib/api/auth';
import Cookies from 'js-cookie';
import { COOKIE_ACCESS_TOKEN } from '@/lib/constants';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    const token = Cookies.get(COOKIE_ACCESS_TOKEN);
    if (!token) {
      clearUser();
      return;
    }
    getMe()
      .then(setUser)
      .catch((err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status !== 401) {
          console.error('getMe failed:', err);
        }
        // apiFetch already removes the cookie on 401+refresh-fail.
        // For other failures (500, network) we keep the cookie so middleware
        // continues protecting routes — don't remove it here.
        clearUser();
      });
  }, [setUser, clearUser]);

  return <>{children}</>;
}
