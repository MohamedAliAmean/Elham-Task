import { Controller, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { INTERNAL_ERROR_RESPONSE } from '../common/error-response.dto';
import { SlotsResponseDto } from './slot.dto';
import { SlotsService } from './slots.service';

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  @ApiOperation({
    summary: 'List available slots',
    description:
      'Returns only slots without an active booking, sorted by `startsAt` ascending, then `id` ascending. ' +
      'Takes no parameters or body. No pagination. No authentication required.',
  })
  @ApiOkResponse({
    description: 'Available slots (possibly empty).',
    type: SlotsResponseDto,
    examples: {
      available: {
        summary: 'Some slots available',
        value: {
          slots: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              startsAt: '2030-01-15T09:00:00.000Z',
              endsAt: '2030-01-15T09:30:00.000Z',
            },
          ],
        },
      },
      empty: { summary: 'No slots available', value: { slots: [] } },
    },
  })
  @ApiInternalServerErrorResponse(INTERNAL_ERROR_RESPONSE)
  async list(): Promise<SlotsResponseDto> {
    return { slots: await this.slots.listAvailable() };
  }
}
