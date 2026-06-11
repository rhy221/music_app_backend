'use client';

import { useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '@/stores/player-store';
import { startPlaySession, sendHeartbeat, endPlaySession, getHlsUrl, getStreamUrl } from '@/lib/api/stream';
import { COOKIE_ACCESS_TOKEN } from '@/lib/constants';
import Cookies from 'js-cookie';

// Singletons shared across every usePlayer() call — ensures all components
// operate on the same Audio element and HLS instance.
const _audio = { current: null as HTMLAudioElement | null };
const _hls = { current: null as Hls | null };
const _heartbeat = { current: null as ReturnType<typeof setInterval> | null };
// Dedup guard: prevents multiple mounted components from each calling loadTrack
// for the same track when currentTrack.id changes.
let _activeTrackId: string | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio.current) {
    _audio.current = new Audio();
    _audio.current.volume = usePlayerStore.getState().volume;
  }
  return _audio.current;
}

export function usePlayer() {
  const store = usePlayerStore();

  const stopHeartbeat = useCallback(() => {
    if (_heartbeat.current) {
      clearInterval(_heartbeat.current);
      _heartbeat.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(
    (sessionId: string) => {
      stopHeartbeat();
      _heartbeat.current = setInterval(() => {
        const pos = Math.floor((_audio.current?.currentTime ?? 0) * 1000);
        sendHeartbeat(sessionId, pos).catch(() => {});
      }, 10_000);
    },
    [stopHeartbeat]
  );

  const loadTrack = useCallback(
    async (trackId: string) => {
      const audio = getAudio();

      // End previous session
      const prevSession = usePlayerStore.getState().sessionId;
      if (prevSession) {
        stopHeartbeat();
        const pos = Math.floor(audio.currentTime * 1000);
        endPlaySession(prevSession, { positionMs: pos, reason: 'SKIPPED' }).catch(() => {});
        store.setSessionId(null);
      }

      // Destroy previous HLS instance
      if (_hls.current) {
        _hls.current.destroy();
        _hls.current = null;
      }

      audio.pause();
      store.setPosition(0);
      store.setDuration(0);

      // Start play session
      const session = await startPlaySession({ trackId }).catch(() => null);
      if (session) {
        store.setSessionId(session.id);
        startHeartbeat(session.id);
      }

      const hlsUrl = getHlsUrl(trackId);
      const token = Cookies.get(COOKIE_ACCESS_TOKEN);

      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr) => {
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          },
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(audio);
        hls.once(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            audio.src = getStreamUrl(trackId);
            audio.load();
            audio.play().catch(() => store.setPlaying(false));
          }
        });
        _hls.current = hls;
      } else {
        audio.src = audio.canPlayType('application/vnd.apple.mpegurl') ? hlsUrl : getStreamUrl(trackId);
        audio.play().catch(() => store.setPlaying(false));
      }

      store.setPlaying(true);

      audio.ondurationchange = () => {
        store.setDuration(Math.floor(audio.duration * 1000));
      };
      audio.ontimeupdate = () => {
        store.setPosition(Math.floor(audio.currentTime * 1000));
      };
      audio.onended = async () => {
        const sid = usePlayerStore.getState().sessionId;
        if (sid) {
          stopHeartbeat();
          await endPlaySession(sid, {
            positionMs: Math.floor(audio.duration * 1000),
            reason: 'COMPLETED',
          }).catch(() => {});
          store.setSessionId(null);
        }

        if (usePlayerStore.getState().repeat === 'one') {
          audio.currentTime = 0;
          store.setPosition(0);
          audio.play().catch(() => {});
          store.setPlaying(true);
          const trackId =
            usePlayerStore.getState().queue[usePlayerStore.getState().currentIndex]?.id;
          if (trackId) {
            const session = await startPlaySession({ trackId }).catch(() => null);
            if (session) {
              store.setSessionId(session.id);
              startHeartbeat(session.id);
            }
          }
          return;
        }

        store.next();
      };
    },
    [startHeartbeat, stopHeartbeat, store]
  );

  const currentTrack = store.queue[store.currentIndex];

  // Fires in every component that mounts usePlayer(). The dedup guard ensures
  // only the first component to react actually calls loadTrack.
  useEffect(() => {
    if (currentTrack && store.isPlaying) {
      if (_activeTrackId === currentTrack.id) return;
      _activeTrackId = currentTrack.id;
      loadTrack(currentTrack.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  const play = useCallback(
    (tracks: Parameters<typeof store.setQueue>[0], index = 0) => {
      store.setQueue(tracks, index);
      store.setPlaying(true);
    },
    [store]
  );

  const togglePlay = useCallback(() => {
    const audio = getAudio();
    if (store.isPlaying) {
      audio.pause();
      store.setPlaying(false);
    } else {
      audio.play().catch(() => {});
      store.setPlaying(true);
    }
  }, [store]);

  const seek = useCallback(
    (ms: number) => {
      const audio = getAudio();
      audio.currentTime = ms / 1000;
      store.setPosition(ms);
    },
    [store]
  );

  const setVolume = useCallback(
    (v: number) => {
      const audio = getAudio();
      audio.volume = v;
      store.setVolume(v);
    },
    [store]
  );

  return { play, togglePlay, seek, setVolume, loadTrack };
}
