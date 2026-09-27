import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [RealtimeModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
