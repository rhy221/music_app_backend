'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { COOKIE_ACCESS_TOKEN, WS_URL } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import type { NotificationDto } from '@/lib/api/types';

interface NotificationWsContextValue {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  latestNotification: NotificationDto | null;
}

const Ctx = createContext<NotificationWsContextValue>({
  unreadCount: 0,
  setUnreadCount: () => {},
  latestNotification: null,
});

export function useNotificationWs() {
  return useContext(Ctx);
}

export function NotificationWsProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<NotificationDto | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = Cookies.get(COOKIE_ACCESS_TOKEN);
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === 'notification') {
          setLatestNotification(msg.payload as NotificationDto);
          setUnreadCount((n) => n + 1);
        }
      } catch {}
    };

    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
    }, 30_000);

    return () => {
      clearInterval(heartbeat);
      ws.close();
    };
  }, [isAuthenticated]);

  return (
    <Ctx.Provider value={{ unreadCount, setUnreadCount, latestNotification }}>
      {children}
    </Ctx.Provider>
  );
}
