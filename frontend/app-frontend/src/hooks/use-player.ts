'use client';

import { useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { usePlayerStore } from '@/stores/player-store';
import { startPlaySession, sendHeartbeat, endPlaySession, getHlsUrl, getStreamUrl } from '@/lib/api/stream';
import { API_BASE, COOKIE_ACCESS_TOKEN } from '@/lib/constants';
import Cookies from 'js-cookie';

export function usePlayer() {
  const store = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = store.volume;
    }
    return audioRef.current;
  }, [store.volume]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(
    (sessionId: string) => {
      stopHeartbeat();
      heartbeatRef.current = setInterval(() => {
        const pos = Math.floor((audioRef.current?.currentTime ?? 0) * 1000);
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

      // Destroy previous HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      audio.pause();
      store.setPosition(0);
      store.setDuration(0);

      // Start new session
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
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            // Fallback to direct stream
            audio.src = getStreamUrl(trackId);
            audio.load();
            audio.play().catch(() => {});
          }
        });
        hlsRef.current = hls;
      } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
        audio.src = hlsUrl;
      } else {
        audio.src = getStreamUrl(trackId);
      }

      audio.play().catch(() => store.setPlaying(false));
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
        store.next();
      };
    },
    [getAudio, startHeartbeat, stopHeartbeat, store]
  );

  const currentTrack = store.queue[store.currentIndex];

  // When current track changes, load it
  useEffect(() => {
    if (currentTrack && store.isPlaying) {
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
  }, [getAudio, store]);

  const seek = useCallback(
    (ms: number) => {
      const audio = getAudio();
      audio.currentTime = ms / 1000;
      store.setPosition(ms);
    },
    [getAudio, store]
  );

  const setVolume = useCallback(
    (v: number) => {
      const audio = getAudio();
      audio.volume = v;
      store.setVolume(v);
    },
    [getAudio, store]
  );

  return { play, togglePlay, seek, setVolume, loadTrack };
}
