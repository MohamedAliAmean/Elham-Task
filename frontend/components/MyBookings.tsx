'use client';

import { useState } from 'react';
import type { MyBooking } from '@/hooks/useMyBookings';
import { formatDate, formatRange } from '@/lib/format';

interface Props {
  items: MyBooking[];
  onCancel: (item: MyBooking) => Promise<void>;
  onClearCancelled: () => void;
}

export function MyBookings({ items, onCancel, onClearCancelled }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const hasCancelled = items.some((i) => i.booking.status === 'cancelled');

  async function cancel(item: MyBooking) {
    setPendingId(item.booking.id);
    try {
      await onCancel(item);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">حجوزاتي</h2>
        {hasCancelled && (
          <button onClick={onClearCancelled} className="text-xs text-slate-500 hover:text-slate-700">
            إخفاء الملغاة
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">لا توجد حجوزات من هذا المتصفح بعد.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const active = item.booking.status === 'active';
            return (
              <li key={item.booking.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.booking.customerName}</p>
                    <p className="text-xs text-slate-500">{formatDate(item.slot.startsAt)}</p>
                    <p className="text-sm tabular-nums" dir="ltr">
                      {formatRange(item.slot)}
                    </p>
                  </div>
                  {active ? (
                    <button
                      onClick={() => cancel(item)}
                      disabled={pendingId === item.booking.id}
                      className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {pendingId === item.booking.id ? '…' : 'إلغاء'}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-600">ملغى</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
