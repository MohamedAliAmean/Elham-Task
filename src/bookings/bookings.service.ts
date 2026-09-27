import { Injectable } from '@nestjs/common';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { SlotEventsGateway } from '../realtime/slot-events.gateway';
import { BookingDto, BookingStatusDto, CreateBookingDto } from './booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SlotEventsGateway,
  ) {}

  /**
   * Concurrency: no read-then-write check. The INSERT itself is guarded by the partial unique
   * index "Booking_one_active_per_slot" (slotId WHERE status = 'active'), so when two requests race
   * PostgreSQL lets exactly one commit and fails the other with a unique violation (P2002 -> 409).
   */
  async create(input: CreateBookingDto): Promise<BookingDto> {
    const slot = await this.prisma.slot.findUnique({ where: { id: input.slotId }, select: { id: true } });
    if (!slot) throw ApiError.slotNotFound();

    let booking: Booking;
    try {
      booking = await this.prisma.booking.create({
        data: { slotId: input.slotId, customerName: input.customerName, customerEmail: input.customerEmail },
      });
    } catch (err) {
      if (isPrismaError(err, 'P2002')) throw ApiError.slotUnavailable();
      if (isPrismaError(err, 'P2003')) throw ApiError.slotNotFound();
      throw err;
    }

    this.events.slotBooked(booking.slotId, booking.id);
    return toDto(booking);
  }

  /**
   * The conditional UPDATE (WHERE status = 'active') is atomic: under concurrent cancels only one
   * statement matches the row, so the transition and its slot.released event happen exactly once.
   * Repeat cancels match nothing and return the stored booking unchanged, without an event.
   * Only the given booking row is touched, so cancelling an old booking never affects a newer one.
   */
  async cancel(bookingId: string): Promise<BookingDto> {
    const { count } = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: BookingStatus.active },
      data: { status: BookingStatus.cancelled, cancelledAt: new Date() },
    });

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw ApiError.bookingNotFound();

    if (count === 1) this.events.slotReleased(booking.slotId, booking.id);
    return toDto(booking);
  }
}

function isPrismaError(err: unknown, code: string): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
}

function toDto(b: Booking): BookingDto {
  return {
    id: b.id,
    slotId: b.slotId,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    status: b.status as BookingStatusDto,
  };
}
