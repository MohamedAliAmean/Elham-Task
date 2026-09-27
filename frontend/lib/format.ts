import type { Slot } from './types';

// The API speaks UTC; slots are shown in UTC too so every user sees the same wall-clock time.
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const timeFormat = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
export const formatRange = (slot: Pick<Slot, 'startsAt' | 'endsAt'>) =>
  `${formatTime(slot.startsAt)} – ${formatTime(slot.endsAt)}`;

export function groupByDay(slots: Slot[]): { day: string; slots: Slot[] }[] {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const day = slot.startsAt.slice(0, 10);
    groups.set(day, [...(groups.get(day) ?? []), slot]);
  }
  return [...groups.entries()].map(([day, daySlots]) => ({ day, slots: daySlots }));
}
