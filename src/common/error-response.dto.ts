import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from './api-error';

export interface ResponseExample {
  summary: string;
  value: unknown;
}

export class ErrorDetailDto {
  @ApiProperty({ enum: Object.values(ErrorCode), example: ErrorCode.SLOT_UNAVAILABLE })
  code: string;

  @ApiProperty({ minLength: 1, example: 'This slot already has an active booking.' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorDetailDto })
  error: ErrorDetailDto;
}

export function errorExample(summary: string, code: ErrorCode, message: string): ResponseExample {
  return { summary, value: { error: { code, message } } };
}

export const INTERNAL_ERROR_RESPONSE = {
  description: 'Unexpected server error. Internal details are never exposed.',
  type: ErrorResponseDto,
  examples: {
    internal: errorExample('Unexpected error', ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred.'),
  },
};
