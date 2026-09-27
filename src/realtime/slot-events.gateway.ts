import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

export interface SlotEventPayload {
  slotId: string;
  bookingId: string;
  available: boolean;
}

/**
 * Broadcast-only gateway on the default namespace "/" and path "/socket.io".
 * Callers must invoke these methods only after the DB change has been committed.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class SlotEventsGateway {
  @WebSocketServer()
  private readonly server: Server;

  slotBooked(slotId: string, bookingId: string): void {
    this.server.emit('slot.booked', { slotId, bookingId, available: false } satisfies SlotEventPayload);
  }

  slotReleased(slotId: string, bookingId: string): void {
    this.server.emit('slot.released', { slotId, bookingId, available: true } satisfies SlotEventPayload);
  }
}
