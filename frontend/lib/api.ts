import type { Booking, CreateBookingInput, Slot } from './types';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  SLOT_NOT_FOUND: 'هذا الموعد غير موجود.',
  SLOT_UNAVAILABLE: 'تم حجز هذا الموعد للتو من شخص آخر. اختر موعدًا آخر.',
  BOOKING_NOT_FOUND: 'الحجز غير موجود.',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.',
  NETWORK_ERROR: 'تعذر الاتصال بالخادم. تأكد أن الـ API يعمل.',
};

/** Arabic message for known codes; validation errors keep the server's specific message. */
export function describeError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.code === 'VALIDATION_ERROR') return `بيانات غير صالحة: ${err.message}`;
    return FRIENDLY_MESSAGES[err.code] ?? err.message;
  }
  return FRIENDLY_MESSAGES.INTERNAL_ERROR;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      cache: 'no-store',
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Network error');
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiRequestError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  listSlots: () => request<{ slots: Slot[] }>('/slots').then((r) => r.slots),

  createBooking: (input: CreateBookingInput) =>
    request<{ booking: Booking }>('/bookings', { method: 'POST', body: JSON.stringify(input) }).then((r) => r.booking),

  cancelBooking: (bookingId: string) =>
    request<{ booking: Booking }>(`/bookings/${bookingId}`, { method: 'DELETE' }).then((r) => r.booking),
};
