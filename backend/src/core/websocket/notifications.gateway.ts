import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/strategies/jwt-access.strategy';

// Replaces Pusher. Maps the three broadcast events found in the Laravel app
// (AppointmentPlaced, ConfirmAppointment, NotificationNotifier) onto
// per-user Socket.IO rooms, analogous to Pusher's private channels
// (App.Models.User.{id}, notification.{id}) which were themselves
// Sanctum-authenticated via routes/channels.php.
//
// This is a skeleton: connection auth + room-join + typed emit helpers are
// wired up; actual emit calls belong in the Appointments/Notifications
// modules once they're built (see MIGRATION_ROADMAP.md phase 3).
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? true, credentials: true },
  namespace: '/realtime',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.join(this.userRoom(payload.sub));
      this.logger.debug(`Socket ${client.id} joined ${this.userRoom(payload.sub)}`);
    } catch {
      client.emit('error', new UnauthorizedException().getResponse());
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  /** Equivalent of the AppointmentPlaced event (channel: appointment-placed). */
  emitAppointmentPlaced(recipientUserIds: (bigint | string)[], payload: unknown) {
    for (const userId of recipientUserIds) {
      this.server.to(this.userRoom(userId)).emit('appointment-placed', payload);
    }
  }

  /** Equivalent of the ConfirmAppointment event (channel: appointment.{userId}). */
  emitAppointmentStatusChanged(userId: bigint | string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('appointment-status-changed', payload);
  }

  /** Equivalent of the NotificationNotifier event (channel: notification, event: notify). */
  emitNotification(userId: bigint | string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit('notify', payload);
  }

  private userRoom(userId: bigint | string): string {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string {
    const token =
      client.handshake.auth?.token ??
      (client.handshake.headers.authorization?.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : undefined);
    if (!token) throw new UnauthorizedException('Missing auth token');
    return token;
  }
}
