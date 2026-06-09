'use client';

import { create } from 'zustand';
import type { TrackSummaryDto } from '@/lib/api/types';

interface PlayerState {
  queue: TrackSummaryDto[];
  currentIndex: number;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  sessionId: string | null;

  setQueue: (tracks: TrackSummaryDto[], startIndex?: number) => void;
  addToQueue: (track: TrackSummaryDto) => void;
  setCurrentIndex: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  setPosition: (ms: number) => void;
  setDuration: (ms: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setSessionId: (id: string | null) => void;
  next: () => void;
  prev: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'none',
  sessionId: null,

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, positionMs: 0 }),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
  setCurrentIndex: (index) => set({ currentIndex: index, positionMs: 0 }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPosition: (ms) => set({ positionMs: ms }),
  setDuration: (ms) => set({ durationMs: ms }),
  setVolume: (volume) => set({ volume }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none' })),
  setSessionId: (id) => set({ sessionId: id }),
  next: () => {
    const { queue, currentIndex, shuffle, repeat } = get();
    if (!queue.length) return;
    let next: number;
    if (shuffle) {
      next = Math.floor(Math.random() * queue.length);
    } else if (currentIndex < queue.length - 1) {
      next = currentIndex + 1;
    } else if (repeat === 'all') {
      next = 0;
    } else {
      return;
    }
    set({ currentIndex: next, positionMs: 0, isPlaying: true });
  },
  prev: () => {
    const { currentIndex, positionMs } = get();
    if (positionMs > 3000) {
      set({ positionMs: 0 });
      return;
    }
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1, positionMs: 0, isPlaying: true });
    }
  },
}));
