import { formatDate, formatRange, groupByDay } from '@/lib/format';
import type { Slot } from '@/lib/types';

interface Props {
  slots: Slot[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  highlightIds: Set<string>;
  onSelect: (slot: Slot) => void;
  onRetry: () => void;
}

export function SlotGrid({ slots, loading, error, selectedId, highlightIds, onSelect, onRetry }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        لا توجد مواعيد متاحة حاليًا. ستظهر المواعيد هنا تلقائيًا عند إلغاء أي حجز.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(slots).map(({ day, slots: daySlots }) => (
        <section key={day}>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">{formatDate(daySlots[0].startsAt)}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {daySlots.map((slot) => {
              const selected = slot.id === selectedId;
              return (
                <button
                  key={slot.id}
                  onClick={() => onSelect(slot)}
                  className={[
                    'flex items-center justify-between rounded-xl border bg-white p-4 text-start shadow-sm transition',
                    'hover:border-indigo-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200',
                    highlightIds.has(slot.id) ? 'animate-flash' : '',
                  ].join(' ')}
                >
                  <span className="text-lg font-semibold tabular-nums" dir="ltr">
                    {formatRange(slot)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      selected ? 'bg-indigo-600 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {selected ? 'محدد' : 'متاح'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
