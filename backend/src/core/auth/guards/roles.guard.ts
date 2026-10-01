import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_AUTHENTICATED_KEY } from '../decorators/any-authenticated.decorator';
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

    const anyAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ANY_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const user: AuthenticatedUser = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      if (anyAuthenticated) return true;
      // Fail closed: a handler under RolesGuard must declare its policy.
      throw new ForbiddenException('No access policy declared for this route');
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
