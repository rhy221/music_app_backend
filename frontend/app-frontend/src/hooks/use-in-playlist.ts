'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getMyPlaylistTrackIds } from '@/lib/api/playlists';

export function useMyPlaylistTrackIds(): Set<string> {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data } = useQuery({
    queryKey: ['my-track-ids'],
    queryFn: getMyPlaylistTrackIds,
    enabled: mounted && isAuthenticated,
    staleTime: 30_000,
  });
  return new Set(data ?? []);
}
