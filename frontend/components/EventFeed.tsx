import type { SlotEventName, SlotEventPayload } from '@/lib/types';

export interface FeedEvent {
  id: number;
  name: SlotEventName;
  payload: SlotEventPayload;
  receivedAt: Date;
}

export function EventFeed({ events }: { events: FeedEvent[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-bold">الأحداث اللحظية</h2>
      <p className="mb-3 text-xs text-slate-500">
        أحداث Socket.IO من الخادم. افتح الصفحة في نافذتين واحجز من إحداهما لترى التحديث في الأخرى.
      </p>
      {events.length === 0 ? (
        <p className="text-sm text-slate-400">لا توجد أحداث بعد.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs" dir="ltr">
              <span
                className={`rounded px-2 py-0.5 font-mono font-semibold ${
                  e.name === 'slot.booked' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {e.name}
              </span>
              <span className="truncate font-mono text-slate-500">{e.payload.slotId.slice(-12)}</span>
              <span className="ms-auto tabular-nums text-slate-400">{e.receivedAt.toLocaleTimeString('en-GB')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
