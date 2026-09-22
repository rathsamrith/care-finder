import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { KioskGuard } from './kiosk.guard';
import { KiosksController } from './kiosks.controller';
import { KiosksService } from './kiosks.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [KiosksController],
  providers: [KiosksService, KioskGuard],
})
export class KiosksModule {}
