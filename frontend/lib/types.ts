export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export type BookingStatus = 'active' | 'cancelled';

export interface Booking {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  status: BookingStatus;
}

export interface CreateBookingInput {
  slotId: string;
  customerName: string;
  customerEmail: string;
}

export type SlotEventName = 'slot.booked' | 'slot.released';

export interface SlotEventPayload {
  slotId: string;
  bookingId: string;
  available: boolean;
}
