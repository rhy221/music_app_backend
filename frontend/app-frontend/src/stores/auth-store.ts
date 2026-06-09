'use client';

import { create } from 'zustand';
import type { UserProfileDto } from '@/lib/api/types';

interface AuthState {
  user: UserProfileDto | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfileDto) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}));
