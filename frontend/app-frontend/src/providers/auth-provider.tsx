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
      .catch(() => clearUser());
  }, [setUser, clearUser]);

  return <>{children}</>;
}
