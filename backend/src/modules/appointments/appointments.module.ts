import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentMailer } from './appointment-mailer';
import { AppointmentRemindersService } from './appointment-reminders.service';
import { CheckInService } from './check-in.service';

// PrismaService (PrismaModule) and NotificationsGateway (WebsocketModule)
// are both @Global(), so no imports array entry is needed for them.
@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentMailer, AppointmentRemindersService, CheckInService],
  exports: [CheckInService],
})
export class AppointmentsModule {}
