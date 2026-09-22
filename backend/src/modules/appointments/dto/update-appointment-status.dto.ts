import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsIn } from 'class-validator';

export type AppointmentStatusTarget = 'hospital' | 'doctor';

// Body for PUT /appointments/:id/update-status - the hospital and the
// doctor each independently set their own status field; AppointmentsService
// re-derives the overall `status` via convergeStatus() after this write.
export class UpdateAppointmentStatusDto {
  @IsIn(['hospital', 'doctor'])
  target!: AppointmentStatusTarget;

  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}
