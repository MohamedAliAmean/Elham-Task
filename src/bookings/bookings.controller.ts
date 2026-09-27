import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorCode } from '../common/api-error';
import { ErrorResponseDto, errorExample, INTERNAL_ERROR_RESPONSE } from '../common/error-response.dto';
import { uuidParamPipe } from '../common/validation';
import { BOOKING_EXAMPLE, BookingResponseDto, CreateBookingDto } from './booking.dto';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking',
    description:
      'Books a slot. A slot accepts only one active booking: when several valid requests for the same available ' +
      'slot arrive concurrently, exactly one gets `201` and the others get `409 SLOT_UNAVAILABLE` ' +
      '(regardless of customer data). `customerName` and `customerEmail` are trimmed before validation and storage. ' +
      'Unknown properties are ignored. On success a `slot.booked` Socket.IO event is broadcast. No authentication required.',
  })
  @ApiBody({
    type: CreateBookingDto,
    examples: {
      valid: {
        summary: 'Valid booking',
        value: { slotId: BOOKING_EXAMPLE.slotId, customerName: 'Alex Morgan', customerEmail: 'alex@example.com' },
      },
      untrimmed: {
        summary: 'Whitespace is trimmed',
        value: { slotId: BOOKING_EXAMPLE.slotId, customerName: '  Alex Morgan ', customerEmail: ' alex@example.com  ' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Booking created with status `active`.',
    type: BookingResponseDto,
    example: { booking: { ...BOOKING_EXAMPLE, status: 'active' } },
  })
  @ApiBadRequestResponse({
    description: 'Missing or invalid input, including a malformed JSON body.',
    type: ErrorResponseDto,
    examples: {
      invalidEmail: errorExample('Invalid email', ErrorCode.VALIDATION_ERROR, 'customerEmail must be a valid email address.'),
      emptyName: errorExample('Blank name', ErrorCode.VALIDATION_ERROR, 'customerName must not be empty.'),
      invalidSlotId: errorExample('Invalid slotId', ErrorCode.VALIDATION_ERROR, 'slotId must be a valid UUID.'),
      invalidJson: errorExample('Malformed JSON', ErrorCode.VALIDATION_ERROR, 'Request body must be valid JSON.'),
    },
  })
  @ApiNotFoundResponse({
    description: '`slotId` is a valid UUID but no such slot exists.',
    type: ErrorResponseDto,
    examples: { slotNotFound: errorExample('Unknown slot', ErrorCode.SLOT_NOT_FOUND, 'Slot not found.') },
  })
  @ApiConflictResponse({
    description: 'The slot already has an active booking (including losing a concurrent race).',
    type: ErrorResponseDto,
    examples: {
      slotUnavailable: errorExample('Slot taken', ErrorCode.SLOT_UNAVAILABLE, 'This slot already has an active booking.'),
    },
  })
  @ApiInternalServerErrorResponse(INTERNAL_ERROR_RESPONSE)
  async create(@Body() body: CreateBookingDto): Promise<BookingResponseDto> {
    return { booking: await this.bookings.create(body) };
  }

  @Delete(':bookingId')
  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Sets an active booking to `cancelled`, making its slot available again, and broadcasts `slot.released`. ' +
      '**Idempotent:** cancelling an already-cancelled booking returns `200` with the same booking, unchanged, and ' +
      'emits no event. Cancelling an old cancelled booking never affects a newer active booking for the same slot. ' +
      'Cancelled bookings stay addressable by id. No request body. No authentication required.',
  })
  @ApiParam({
    name: 'bookingId',
    description: 'Booking id (UUID).',
    schema: { type: 'string', format: 'uuid' },
    example: BOOKING_EXAMPLE.id,
  })
  @ApiOkResponse({
    description: 'Booking is cancelled (either by this request or by an earlier one).',
    type: BookingResponseDto,
    examples: {
      cancelled: { summary: 'Cancelled now', value: { booking: { ...BOOKING_EXAMPLE, status: 'cancelled' } } },
      alreadyCancelled: {
        summary: 'Repeat cancel (no change, no event)',
        value: { booking: { ...BOOKING_EXAMPLE, status: 'cancelled' } },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '`bookingId` is not a valid UUID.',
    type: ErrorResponseDto,
    examples: { invalidId: errorExample('Invalid id', ErrorCode.VALIDATION_ERROR, 'bookingId must be a valid UUID.') },
  })
  @ApiNotFoundResponse({
    description: '`bookingId` is a valid UUID but no such booking exists.',
    type: ErrorResponseDto,
    examples: { bookingNotFound: errorExample('Unknown booking', ErrorCode.BOOKING_NOT_FOUND, 'Booking not found.') },
  })
  @ApiInternalServerErrorResponse(INTERNAL_ERROR_RESPONSE)
  async cancel(@Param('bookingId', uuidParamPipe('bookingId')) bookingId: string): Promise<BookingResponseDto> {
    return { booking: await this.bookings.cancel(bookingId) };
  }
}
