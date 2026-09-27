'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookingForm } from '@/components/BookingForm';
import { EventFeed, FeedEvent } from '@/components/EventFeed';
import { MyBookings } from '@/components/MyBookings';
import { SlotGrid } from '@/components/SlotGrid';
import { Toast, Toasts } from '@/components/Toasts';
import { MyBooking, useMyBookings } from '@/hooks/useMyBookings';
import { useSlotEvents } from '@/hooks/useSlotEvents';
import { api, describeError } from '@/lib/api';
import type { Booking, Slot, SlotEventName, SlotEventPayload } from '@/lib/types';

export default function HomePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const myBookings = useMyBookings();

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setSlots(await api.listSlots());
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const highlight = useCallback((slotId: string) => {
    setHighlightIds((prev) => new Set(prev).add(slotId));
    setTimeout(
      () =>
        setHighlightIds((prev) => {
          const next = new Set(prev);
          next.delete(slotId);
          return next;
        }),
      1300,
    );
  }, []);

  const handleEvent = useCallback(
    (name: SlotEventName, payload: SlotEventPayload) => {
      setEvents((prev) => [{ id: ++nextId.current, name, payload, receivedAt: new Date() }, ...prev].slice(0, 12));

      if (name === 'slot.booked') {
        setSlots((prev) => prev.filter((s) => s.id !== payload.slotId));
      } else {
        // The event carries no times, so reload the list to get the released slot back in order.
        myBookings.markCancelled(payload.bookingId);
        highlight(payload.slotId);
        void refresh();
      }
    },
    [highlight, myBookings, refresh],
  );

  const connected = useSlotEvents({ onEvent: handleEvent, onConnect: refresh });

  function handleBooked(booking: Booking, slot: Slot) {
    myBookings.add({ booking, slot });
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    setSelected(null);
    notify('success', 'تم الحجز بنجاح.');
  }

  async function handleCancel(item: MyBooking) {
    try {
      const booking = await api.cancelBooking(item.booking.id);
      myBookings.update(booking);
      notify('info', 'تم إلغاء الحجز وأصبح الموعد متاحًا.');
      void refresh();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  const selectedTaken = selected !== null && !loading && !slots.some((s) => s.id === selected.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">حجز المواعيد</h1>
          <p className="mt-1 text-sm text-slate-500">اختر موعدًا متاحًا واحجزه. كل الأوقات بتوقيت UTC.</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
            connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
          {connected ? 'متصل – تحديثات لحظية' : 'غير متصل'}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-4 font-bold">
            المواعيد المتاحة {!loading && !loadError && <span className="text-slate-400">({slots.length})</span>}
          </h2>
          <SlotGrid
            slots={slots}
            loading={loading}
            error={loadError}
            selectedId={selected?.id ?? null}
            highlightIds={highlightIds}
            onSelect={setSelected}
            onRetry={refresh}
          />
        </section>

        <aside className="space-y-6">
          {selected ? (
            <BookingForm
              key={selected.id}
              slot={selected}
              taken={selectedTaken}
              onBooked={handleBooked}
              onConflict={refresh}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
              اختر موعدًا من القائمة لبدء الحجز.
            </div>
          )}
          <MyBookings
            items={myBookings.items}
            onCancel={handleCancel}
            onClearCancelled={myBookings.clearCancelled}
          />
          <EventFeed events={events} />
        </aside>
      </div>

      <Toasts toasts={toasts} />
    </main>
  );
}
