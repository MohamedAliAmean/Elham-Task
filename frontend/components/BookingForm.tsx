'use client';

import { FormEvent, useState } from 'react';
import { ApiRequestError, api, describeError } from '@/lib/api';
import { formatDate, formatRange } from '@/lib/format';
import type { Booking, Slot } from '@/lib/types';

interface Props {
  slot: Slot;
  /** True when a realtime event says someone else just booked this slot. */
  taken: boolean;
  onBooked: (booking: Booking, slot: Slot) => void;
  onConflict: () => void;
  onClose: () => void;
}

export function BookingForm({ slot, taken, onBooked, onConflict, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api.createBooking({ slotId: slot.id, customerName: name, customerEmail: email });
      onBooked(booking, slot);
    } catch (err) {
      setError(describeError(err));
      if (err instanceof ApiRequestError && (err.status === 409 || err.status === 404)) onConflict();
    } finally {
      setSubmitting(false);
    }
  }

  const showTaken = taken && !submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">تأكيد الحجز</h2>
          <p className="mt-1 text-sm text-slate-500">{formatDate(slot.startsAt)}</p>
          <p className="font-semibold tabular-nums text-indigo-700" dir="ltr">
            {formatRange(slot)} UTC
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="إغلاق">
          ✕
        </button>
      </div>

      {showTaken && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          تم حجز هذا الموعد للتو من شخص آخر. اختر موعدًا آخر من القائمة.
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">الاسم</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={200}
          autoComplete="name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="مثال: Alex Morgan"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">البريد الإلكتروني</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          maxLength={254}
          autoComplete="email"
          dir="ltr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="alex@example.com"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting || showTaken}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'جارٍ الحجز…' : 'احجز الموعد'}
      </button>
    </form>
  );
}
