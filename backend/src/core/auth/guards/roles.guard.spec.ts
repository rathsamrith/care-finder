import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AnyAuthenticated } from '../decorators/any-authenticated.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

class Undeclared {
  handler() {}
}
class Open {
  @AnyAuthenticated()
  handler() {}
}
class RoleOnly {
  @Roles('hospital')
  handler() {}
}
class PermissionOnly {
  @Permissions('Hospital create')
  handler() {}
}

function run(target: new () => { handler(): void }, user: unknown) {
  const guard = new RolesGuard(new Reflector());
  const context: any = {
    getHandler: () => target.prototype.handler,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
  return guard.canActivate(context);
}

const user = { roles: ['user'], permissions: [] as string[] };

describe('RolesGuard', () => {
  it('denies a route that declares no policy (fails closed)', () => {
    expect(() => run(Undeclared, user)).toThrow(ForbiddenException);
  });

  it('allows a signed-in user on an @AnyAuthenticated route', () => {
    expect(run(Open, user)).toBe(true);
  });

  it('still rejects anonymous callers on an @AnyAuthenticated route', () => {
    expect(() => run(Open, undefined)).toThrow(ForbiddenException);
  });

  it('enforces @Roles', () => {
    expect(run(RoleOnly, { roles: ['hospital'], permissions: [] })).toBe(true);
    expect(() => run(RoleOnly, user)).toThrow(ForbiddenException);
  });

  it('enforces @Permissions', () => {
    expect(run(PermissionOnly, { roles: [], permissions: ['Hospital create'] })).toBe(true);
    expect(() => run(PermissionOnly, user)).toThrow(ForbiddenException);
  });
});
