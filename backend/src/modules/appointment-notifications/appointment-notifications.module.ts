import { Module } from '@nestjs/common';
import { AppointmentNotificationsController } from './appointment-notifications.controller';
import { AppointmentNotificationsService } from './appointment-notifications.service';

// PrismaService (PrismaModule) is @Global(), so no imports array entry is
// needed for it.
@Module({
  controllers: [AppointmentNotificationsController],
  providers: [AppointmentNotificationsService],
})
export class AppointmentNotificationsModule {}
