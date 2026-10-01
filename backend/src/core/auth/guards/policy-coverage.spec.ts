import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ANY_AUTHENTICATED_KEY } from '../decorators/any-authenticated.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return controllerFiles(path);
    return name.endsWith('.controller.ts') ? [path] : [];
  });
}

const usesRolesGuard = (target: object) =>
  (Reflect.getMetadata(GUARDS_METADATA, target) ?? []).includes(RolesGuard);

// RolesGuard fails closed at runtime; this catches a missing policy in CI
// instead of as a 403 in production.
describe('route policy coverage', () => {
  const srcRoot = join(__dirname, '..', '..', '..');
  const missing: string[] = [];

  for (const file of controllerFiles(srcRoot)) {
    const exported = Object.values(require(file)) as Function[];
    for (const controller of exported) {
      if (typeof controller !== 'function' || !controller.prototype) continue;
      const classGuarded = usesRolesGuard(controller);

      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
        if (!classGuarded && !usesRolesGuard(handler)) continue;

        const declared = [ROLES_KEY, PERMISSIONS_KEY, ANY_AUTHENTICATED_KEY].some(
          (key) => Reflect.getMetadata(key, handler) || Reflect.getMetadata(key, controller),
        );
        if (!declared) missing.push(`${controller.name}.${name}`);
      }
    }
  }

  it('every handler behind RolesGuard declares @Roles, @Permissions or @AnyAuthenticated', () => {
    expect(missing).toEqual([]);
  });
});
