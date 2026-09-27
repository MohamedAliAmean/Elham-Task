import { ApiProperty } from '@nestjs/swagger';

export class SlotDto {
  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  id: string;

  @ApiProperty({ format: 'date-time', description: 'ISO 8601, UTC.', example: '2030-01-15T09:00:00.000Z' })
  startsAt: string;

  @ApiProperty({
    format: 'date-time',
    description: 'ISO 8601, UTC. Always after startsAt.',
    example: '2030-01-15T09:30:00.000Z',
  })
  endsAt: string;
}

export class SlotsResponseDto {
  @ApiProperty({
    type: [SlotDto],
    description: 'Available slots only (no active booking), sorted by startsAt ascending, then id ascending.',
  })
  slots: SlotDto[];
}
