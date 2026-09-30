import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../core/auth/strategies/jwt-access.strategy';

// Excludes `password` - `include: { fromUser: true }` would otherwise leak
// the sender's password hash (BigIntInterceptor only stringifies bigints,
// it doesn't strip fields).
const SAFE_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  name: true,
  email: true,
  phone: true,
  profile: true,
} satisfies Prisma.UserSelect;

const NOTIFICATION_INCLUDE = {
  appointment: true,
  fromUser: { select: SAFE_USER_SELECT },
} satisfies Prisma.AppointmentNotificationInclude;

// Personal notification inbox - always scoped to the caller as recipient,
// with no cross-user access (not even for admin - this isn't an admin
// resource, see the module spec in MIGRATION_ROADMAP.md phase 3).
@Injectable()
export class AppointmentNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser) {
    return this.prisma.appointmentNotification.findMany({
      where: { userId: user.id },
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  unread(user: AuthenticatedUser) {
    return this.prisma.appointmentNotification.findMany({
      where: { userId: user.id, isRead: false },
      include: NOTIFICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsSeen(user: AuthenticatedUser, id: bigint) {
    const notification = await this.prisma.appointmentNotification.findUnique({ where: { id } });
    // Don't leak existence of another user's notification - 404 either way.
    if (!notification || notification.userId !== user.id) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.appointmentNotification.update({
      where: { id },
      data: { isRead: true },
      include: NOTIFICATION_INCLUDE,
    });
  }
}
