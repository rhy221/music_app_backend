'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { COOKIE_ACCESS_TOKEN, NOTIFICATION_URL } from '@/lib/constants';
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
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = Cookies.get(COOKIE_ACCESS_TOKEN);
    if (!token) return;

    // Connect directly to notification-service (Socket.IO namespace /ws).
    // The service validates the JWT itself, so no gateway proxy needed.
    const socket = io(`${NOTIFICATION_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('notification', (msg: { type: string; payload: NotificationDto }) => {
      setLatestNotification(msg.payload);
      setUnreadCount((n) => n + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  return (
    <Ctx.Provider value={{ unreadCount, setUnreadCount, latestNotification }}>
      {children}
    </Ctx.Provider>
  );
}
