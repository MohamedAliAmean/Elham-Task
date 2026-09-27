import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// class-validator runs a property's decorators bottom-up and we stop at the first error,
// so the most basic check (IsDefined) sits closest to the property.
export class CreateBookingDto {
  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID('all', { message: 'slotId must be a valid UUID.' })
  @IsString({ message: 'slotId must be a string.' })
  @IsDefined({ message: 'slotId is required.' })
  slotId: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 200,
    description: 'Leading/trailing whitespace is trimmed before validation and storage. Must be non-empty after trimming.',
    example: 'Alex Morgan',
  })
  @Transform(trim)
  @MaxLength(200, { message: 'customerName must be at most 200 characters.' })
  @IsNotEmpty({ message: 'customerName must not be empty.' })
  @IsString({ message: 'customerName must be a string.' })
  @IsDefined({ message: 'customerName is required.' })
  customerName: string;

  @ApiProperty({
    format: 'email',
    maxLength: 254,
    description: 'Leading/trailing whitespace is trimmed before validation and storage. Must be a valid email address.',
    example: 'alex@example.com',
  })
  @Transform(trim)
  @MaxLength(254, { message: 'customerEmail must be at most 254 characters.' })
  @IsEmail({}, { message: 'customerEmail must be a valid email address.' })
  @IsString({ message: 'customerEmail must be a string.' })
  @IsDefined({ message: 'customerEmail is required.' })
  customerEmail: string;
}

export enum BookingStatusDto {
  active = 'active',
  cancelled = 'cancelled',
}

export class BookingDto {
  @ApiProperty({ format: 'uuid', example: '22222222-2222-4222-8222-222222222222' })
  id: string;

  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  slotId: string;

  @ApiProperty({ example: 'Alex Morgan' })
  customerName: string;

  @ApiProperty({ format: 'email', example: 'alex@example.com' })
  customerEmail: string;

  @ApiProperty({ enum: BookingStatusDto, enumName: 'BookingStatus', example: BookingStatusDto.active })
  status: BookingStatusDto;
}

export class BookingResponseDto {
  @ApiProperty({ type: BookingDto })
  booking: BookingDto;
}

export const BOOKING_EXAMPLE = {
  id: '22222222-2222-4222-8222-222222222222',
  slotId: '11111111-1111-4111-8111-111111111111',
  customerName: 'Alex Morgan',
  customerEmail: 'alex@example.com',
};
