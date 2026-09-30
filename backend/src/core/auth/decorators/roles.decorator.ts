import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage: @Roles('admin', 'hospital') - user needs at least one of the listed
// roles. Replaces the inline `$user->hasRole('x') || $user->hasRole('y')`
// branching duplicated across nearly every Laravel API controller method.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
