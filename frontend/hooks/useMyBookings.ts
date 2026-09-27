'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Booking, Slot } from '@/lib/types';

export interface MyBooking {
  booking: Booking;
  slot: Slot;
}

const STORAGE_KEY = 'booking-demo.my-bookings';

/**
 * The API has no "list my bookings" endpoint (and no auth), so bookings made in this browser
 * are remembered in localStorage to be able to cancel them later.
 */
export function useMyBookings() {
  const [items, setItems] = useState<MyBooking[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as MyBooking[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = useCallback((item: MyBooking) => setItems((prev) => [item, ...prev]), []);

  const update = useCallback(
    (booking: Booking) => setItems((prev) => prev.map((i) => (i.booking.id === booking.id ? { ...i, booking } : i))),
    [],
  );

  const markCancelled = useCallback(
    (bookingId: string) =>
      setItems((prev) =>
        prev.map((i) => (i.booking.id === bookingId ? { ...i, booking: { ...i.booking, status: 'cancelled' as const } } : i)),
      ),
    [],
  );

  const clearCancelled = useCallback(() => setItems((prev) => prev.filter((i) => i.booking.status === 'active')), []);

  return { items, add, update, markCancelled, clearCancelled };
}
