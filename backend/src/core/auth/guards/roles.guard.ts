import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../strategies/jwt-access.strategy';

// Must run after JwtAuthGuard (relies on request.user already being set).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const hasRole = requiredRoles?.some((role) => user.roles.includes(role));
    const hasPermission = requiredPermissions?.some((permission) =>
      user.permissions.includes(permission),
    );

    if (requiredRoles?.length && hasRole) return true;
    if (requiredPermissions?.length && hasPermission) return true;

    throw new ForbiddenException('Insufficient role or permission');
  }
}
