'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { SlotEventName, SlotEventPayload } from '@/lib/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Handlers {
  onEvent: (name: SlotEventName, payload: SlotEventPayload) => void;
  /** Fired on every (re)connect; events missed while offline are not replayed, so callers should refetch. */
  onConnect?: () => void;
}

export function useSlotEvents(handlers: Handlers): boolean {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });

    socket.on('connect', () => {
      setConnected(true);
      handlersRef.current.onConnect?.();
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('slot.booked', (p: SlotEventPayload) => handlersRef.current.onEvent('slot.booked', p));
    socket.on('slot.released', (p: SlotEventPayload) => handlersRef.current.onEvent('slot.released', p));

    return () => {
      socket.disconnect();
    };
  }, []);

  return connected;
}
