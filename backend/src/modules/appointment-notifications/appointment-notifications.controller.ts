import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AppointmentNotificationsService } from './appointment-notifications.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Laravel routes: GET appointment-notify, GET appointment-notify/unseen,
// PUT appointment-notify/:id/markAsSeen (see MIGRATION_ROADMAP.md route
// mapping table). Renamed to the plural REST-ish `appointment-notifications`
// resource path per this module's spec.
@UseGuards(JwtAuthGuard)
@Controller('appointment-notifications')
export class AppointmentNotificationsController {
  constructor(private readonly appointmentNotificationsService: AppointmentNotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentNotificationsService.list(user);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentNotificationsService.unread(user);
  }

  @Put(':id/mark-as-seen')
  markAsSeen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointmentNotificationsService.markAsSeen(user, BigInt(id));
  }
}
