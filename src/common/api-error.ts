import { HttpException, HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SLOT_NOT_FOUND: 'SLOT_NOT_FOUND',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorBody {
  error: { code: string; message: string };
}

/** Domain error carrying the spec's error code; rendered by ApiExceptionFilter. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
  ) {
    super({ error: { code, message } } satisfies ErrorBody, status);
  }

  static validation(message: string) {
    return new ApiError(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, message);
  }

  static slotNotFound() {
    return new ApiError(HttpStatus.NOT_FOUND, ErrorCode.SLOT_NOT_FOUND, 'Slot not found.');
  }

  static slotUnavailable() {
    return new ApiError(HttpStatus.CONFLICT, ErrorCode.SLOT_UNAVAILABLE, 'This slot already has an active booking.');
  }

  static bookingNotFound() {
    return new ApiError(HttpStatus.NOT_FOUND, ErrorCode.BOOKING_NOT_FOUND, 'Booking not found.');
  }
}
